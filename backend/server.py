"""
CondoClub API v3.0 - Multi-Tenant Scalable Architecture
A private buying club platform for condominium residents
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, Body
from fastapi.responses import JSONResponse, HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import hashlib
import hmac
import bcrypt
from jose import jwt, JWTError
import re
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ==================== CONFIGURATION ====================

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

MERCADOPAGO_ACCESS_TOKEN = os.environ.get('MERCADOPAGO_ACCESS_TOKEN', '')
MERCADOPAGO_PUBLIC_KEY = os.environ.get('MERCADOPAGO_PUBLIC_KEY', '')
MERCADOPAGO_WEBHOOK_SECRET = os.environ.get('MERCADOPAGO_WEBHOOK_SECRET', '')

JWT_SECRET = os.environ.get('JWT_SECRET', 'condoclub-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 168

APP_URL = os.environ.get('APP_URL', 'https://membership-refactor-1.preview.emergentagent.com')
ADMIN_URL = os.environ.get('ADMIN_URL', 'https://admin.condoclub.app')
SUBSCRIPTION_PRICE = 19.90

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="CondoClub API",
    description="Multi-tenant marketplace platform for condominium residents",
    version="3.0.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================

class UserRole(str, Enum):
    RESIDENT = "resident"
    SUPPLIER = "supplier"
    ADMIN = "admin"
    OPERATOR = "operator"
    SUPPORT = "support"

class BuildingStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"

class DealStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    LOCKED = "locked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "resident"
    building_id: Optional[str] = None
    created_at: datetime
    phone: Optional[str] = None
    subscription_status: str = "inactive"
    auth_provider: str = "google"
    status: str = "active"

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2, max_length=100)
    
    @validator('password')
    def password_strength(cls, v):
        if not re.search(r'[A-Za-z]', v) or not re.search(r'\d', v):
            raise ValueError('Password must contain letters and numbers')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class Building(BaseModel):
    building_id: str
    name: str
    address: str
    city: str
    state: str
    zip_code: str
    unit_count: int
    invite_code: str
    status: str = "active"
    created_at: datetime
    image_url: Optional[str] = None
    features: Dict[str, bool] = {}

class BuildingCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    address: str = Field(min_length=5, max_length=300)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=2)
    zip_code: str = Field(min_length=8, max_length=10)
    unit_count: int = Field(gt=0, le=10000)
    features: Optional[Dict[str, bool]] = None

class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    unit_count: Optional[int] = None
    status: Optional[str] = None
    features: Optional[Dict[str, bool]] = None

class Membership(BaseModel):
    membership_id: str
    user_id: str
    building_id: str
    unit_number: str
    status: str = "active"
    joined_at: datetime

class MembershipCreate(BaseModel):
    building_id: Optional[str] = None
    invite_code: Optional[str] = None
    unit_number: str = Field(min_length=1, max_length=20)

class Supplier(BaseModel):
    supplier_id: str
    user_id: Optional[str] = None
    company_name: str
    description: str
    category: str
    status: str = "pending"
    created_at: datetime
    phone: Optional[str] = None
    email: Optional[str] = None
    cities_served: List[str] = []
    rating: float = 0.0
    total_reviews: int = 0

class SupplierCreate(BaseModel):
    company_name: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=10, max_length=1000)
    category: str = Field(min_length=2, max_length=50)
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    cities_served: List[str] = []

class SupplierUpdate(BaseModel):
    company_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    cities_served: Optional[List[str]] = None
    status: Optional[str] = None

class DealTier(BaseModel):
    min_participants: int = Field(gt=0)
    price: float = Field(gt=0)
    discount_percent: float = Field(ge=0, le=100)

class Deal(BaseModel):
    deal_id: str
    supplier_id: str
    building_id: str
    title: str
    description: str
    category: str
    original_price: float
    tiers: List[DealTier]
    current_price: float
    min_participants: int
    max_participants: int
    current_participants: int = 0
    status: str = "active"
    service_date: Optional[datetime] = None
    deadline: datetime
    created_at: datetime
    image_url: Optional[str] = None

class DealCreate(BaseModel):
    supplier_id: str
    building_id: str
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=20, max_length=2000)
    category: str = Field(min_length=2, max_length=50)
    original_price: float = Field(gt=0)
    tiers: List[DealTier]
    min_participants: int = Field(gt=0)
    max_participants: int = Field(gt=0)
    service_date: Optional[datetime] = None
    deadline: datetime

class DealUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    original_price: Optional[float] = None
    tiers: Optional[List[DealTier]] = None
    min_participants: Optional[int] = None
    max_participants: Optional[int] = None
    service_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None

class Booking(BaseModel):
    booking_id: str
    deal_id: str
    user_id: str
    building_id: str
    status: str = "pending"
    service_date: Optional[datetime] = None
    created_at: datetime
    notes: Optional[str] = None
    payment_id: Optional[str] = None

class Payment(BaseModel):
    payment_id: str
    user_id: str
    building_id: Optional[str] = None
    deal_id: Optional[str] = None
    booking_id: Optional[str] = None
    type: str
    amount: float
    currency: str = "BRL"
    status: str = "pending"
    mercadopago_id: Optional[str] = None
    mercadopago_status: Optional[str] = None
    preference_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class PaymentCreate(BaseModel):
    deal_id: Optional[str] = None
    type: str = Field(pattern='^(subscription|deal_payment)$')

class Subscription(BaseModel):
    subscription_id: str
    user_id: str
    building_id: Optional[str] = None
    status: str = "active"
    plan: str = "basic"
    price: float = 19.90
    started_at: datetime
    expires_at: datetime
    payment_id: Optional[str] = None

class Transaction(BaseModel):
    transaction_id: str
    user_id: str
    building_id: Optional[str] = None
    deal_id: Optional[str] = None
    payment_id: Optional[str] = None
    type: str
    amount: float
    status: str = "pending"
    created_at: datetime

# ==================== ERROR HANDLING ====================

class APIError(Exception):
    def __init__(self, status_code: int, detail: str, error_code: str = None):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code or "UNKNOWN_ERROR"

@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": True, "error_code": exc.error_code, "detail": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": True, "error_code": "INTERNAL_ERROR", "detail": "An internal error occurred"}
    )

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, role: str = "resident") -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

async def get_current_user(request: Request) -> Optional[User]:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        return None
    
    payload = decode_jwt_token(session_token)
    if payload and payload.get("user_id"):
        user_doc = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if user_doc:
            # Get building_id from membership
            membership = await db.memberships.find_one(
                {"user_id": payload["user_id"], "status": "active"},
                {"_id": 0}
            )
            if membership:
                user_doc["building_id"] = membership["building_id"]
            return User(**user_doc)
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if user_doc:
        membership = await db.memberships.find_one(
            {"user_id": session["user_id"], "status": "active"},
            {"_id": 0}
        )
        if membership:
            user_doc["building_id"] = membership["building_id"]
        return User(**user_doc)
    return None

async def require_auth(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Account is not active")
    return user

async def require_admin(request: Request) -> User:
    user = await require_auth(request)
    if user.role not in [UserRole.ADMIN.value, UserRole.OPERATOR.value, UserRole.SUPPORT.value]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_super_admin(request: Request) -> User:
    user = await require_auth(request)
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user

async def require_supplier(request: Request) -> User:
    user = await require_auth(request)
    if user.role not in [UserRole.SUPPLIER.value, UserRole.ADMIN.value]:
        raise HTTPException(status_code=403, detail="Supplier access required")
    return user

# ==================== AUTH ENDPOINTS ====================

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

@api_router.post("/auth/session")
@limiter.limit("10/minute")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    async with httpx.AsyncClient() as http_client:
        try:
            auth_response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            user_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=500, detail="Authentication failed")
    
    session_data = SessionDataResponse(**user_data)
    existing_user = await db.users.find_one({"email": session_data.email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": session_data.email,
            "name": session_data.name,
            "picture": session_data.picture,
            "role": "resident",
            "created_at": datetime.now(timezone.utc),
            "subscription_status": "inactive",
            "auth_provider": "google",
            "status": "active"
        }
        await db.users.insert_one(new_user)
        logger.info(f"New user created: {user_id}")
    
    session_doc = {
        "user_id": user_id,
        "session_token": session_data.session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_data.session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc, "session_token": session_data.session_token}

@api_router.post("/auth/register")
@limiter.limit("5/minute")
async def register_email(request: Request, data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(data.password)
    
    new_user = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "picture": None,
        "role": "resident",
        "created_at": datetime.now(timezone.utc),
        "subscription_status": "inactive",
        "auth_provider": "email",
        "password_hash": password_hash,
        "status": "active"
    }
    
    await db.users.insert_one(new_user)
    logger.info(f"New email user registered: {user_id}")
    
    token = create_jwt_token(user_id)
    del new_user["password_hash"]
    new_user.pop("_id", None)
    
    return {"user": new_user, "session_token": token}

@api_router.post("/auth/login")
@limiter.limit("10/minute")
async def login_email(request: Request, data: UserLogin, response: Response):
    user = await db.users.find_one({"email": data.email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user.get("status") != "active":
        raise HTTPException(status_code=403, detail="Account is not active")
    
    if user.get("auth_provider") != "email":
        raise HTTPException(status_code=400, detail="Please use Google login for this account")
    
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_jwt_token(user["user_id"], user.get("role", "resident"))
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    user_doc = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    return {"user": user_doc, "session_token": token}

@api_router.post("/admin/login")
@limiter.limit("5/minute")
async def admin_login(request: Request, data: AdminLogin, response: Response):
    """Admin dashboard login"""
    user = await db.users.find_one({"email": data.email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("role") not in [UserRole.ADMIN.value, UserRole.OPERATOR.value, UserRole.SUPPORT.value]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user.get("status") != "active":
        raise HTTPException(status_code=403, detail="Account is not active")
    
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["user_id"], user["role"])
    
    response.set_cookie(
        key="admin_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=24 * 60 * 60,  # 24 hours for admin
        path="/"
    )
    
    logger.info(f"Admin login: {user['email']} ({user['role']})")
    
    user_doc = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    return {"user": user_doc, "token": token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    membership = await db.memberships.find_one(
        {"user_id": user.user_id, "status": "active"},
        {"_id": 0}
    )
    
    building = None
    if membership:
        building = await db.buildings.find_one(
            {"building_id": membership["building_id"]},
            {"_id": 0}
        )
    
    return {"user": user.model_dump(), "membership": membership, "building": building}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    response.delete_cookie(key="admin_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.delete("/auth/account")
async def delete_account(request: Request, response: Response):
    user = await require_auth(request)
    
    logger.info(f"Account deletion requested for user: {user.user_id}")
    
    await db.user_sessions.delete_many({"user_id": user.user_id})
    await db.memberships.delete_many({"user_id": user.user_id})
    await db.deal_participants.delete_many({"user_id": user.user_id})
    await db.bookings.delete_many({"user_id": user.user_id})
    await db.payments.delete_many({"user_id": user.user_id})
    await db.subscriptions.delete_many({"user_id": user.user_id})
    await db.transactions.delete_many({"user_id": user.user_id})
    await db.suppliers.delete_many({"user_id": user.user_id})
    await db.users.delete_one({"user_id": user.user_id})
    
    response.delete_cookie(key="session_token", path="/")
    logger.info(f"Account deleted successfully: {user.user_id}")
    
    return {"message": "Account deleted successfully"}

@api_router.put("/auth/profile")
async def update_profile(request: Request):
    user = await require_auth(request)
    body = await request.json()
    
    allowed_fields = ["name", "phone"]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    await db.users.update_one({"user_id": user.user_id}, {"$set": update_data})
    return {"message": "Profile updated successfully"}

# ==================== BUILDINGS ENDPOINTS ====================

@api_router.get("/buildings")
async def get_buildings(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    buildings = await db.buildings.find(query, {"_id": 0}).to_list(1000)
    return buildings

@api_router.get("/buildings/{building_id}")
async def get_building(building_id: str):
    building = await db.buildings.find_one({"building_id": building_id}, {"_id": 0})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    
    resident_count = await db.memberships.count_documents({
        "building_id": building_id,
        "status": "active"
    })
    building["resident_count"] = resident_count
    return building

@api_router.post("/buildings", response_model=Building)
async def create_building(data: BuildingCreate, user: User = Depends(require_admin)):
    building_id = f"bld_{uuid.uuid4().hex[:12]}"
    invite_code = uuid.uuid4().hex[:8].upper()
    
    default_features = {
        "marketplace_enabled": True,
        "car_wash_enabled": False,
        "wine_club_enabled": False,
        "gym_enabled": False,
        "pool_enabled": False
    }
    
    features = {**default_features, **(data.features or {})}
    
    building = Building(
        building_id=building_id,
        invite_code=invite_code,
        status="active",
        created_at=datetime.now(timezone.utc),
        features=features,
        **{k: v for k, v in data.model_dump().items() if k != 'features'}
    )
    
    await db.buildings.insert_one(building.model_dump())
    logger.info(f"New building created: {building_id} by admin {user.user_id}")
    return building

@api_router.put("/buildings/{building_id}")
async def update_building(building_id: str, data: BuildingUpdate, user: User = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.buildings.update_one(
        {"building_id": building_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Building not found")
    
    logger.info(f"Building {building_id} updated by admin {user.user_id}")
    return {"message": "Building updated successfully"}

@api_router.get("/buildings/code/{invite_code}")
async def get_building_by_code(invite_code: str):
    building = await db.buildings.find_one(
        {"invite_code": invite_code.upper(), "status": {"$ne": "inactive"}},
        {"_id": 0}
    )
    if not building:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    return building

@api_router.get("/buildings/{building_id}/residents")
async def get_building_residents(building_id: str, user: User = Depends(require_admin)):
    memberships = await db.memberships.find(
        {"building_id": building_id, "status": "active"},
        {"_id": 0}
    ).to_list(1000)
    
    residents = []
    for membership in memberships:
        user_doc = await db.users.find_one(
            {"user_id": membership["user_id"]},
            {"_id": 0, "password_hash": 0}
        )
        if user_doc:
            user_doc["unit_number"] = membership["unit_number"]
            user_doc["joined_at"] = membership["joined_at"]
            residents.append(user_doc)
    
    return residents

# ==================== MEMBERSHIP ENDPOINTS ====================

@api_router.post("/memberships")
async def join_building(data: MembershipCreate, request: Request):
    user = await require_auth(request)
    
    existing = await db.memberships.find_one({
        "user_id": user.user_id,
        "status": "active"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already member of a building")
    
    building = None
    if data.invite_code:
        building = await db.buildings.find_one({
            "invite_code": data.invite_code.upper(),
            "status": {"$ne": "inactive"}
        })
    elif data.building_id:
        building = await db.buildings.find_one({
            "building_id": data.building_id,
            "status": {"$ne": "inactive"}
        })
    
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    
    membership = Membership(
        membership_id=f"mem_{uuid.uuid4().hex[:12]}",
        user_id=user.user_id,
        building_id=building["building_id"],
        unit_number=data.unit_number,
        joined_at=datetime.now(timezone.utc)
    )
    
    await db.memberships.insert_one(membership.model_dump())
    logger.info(f"User {user.user_id} joined building {building['building_id']}")
    return membership.model_dump()

@api_router.get("/memberships/my")
async def get_my_membership(request: Request):
    user = await require_auth(request)
    
    membership = await db.memberships.find_one(
        {"user_id": user.user_id, "status": "active"},
        {"_id": 0}
    )
    
    if not membership:
        return None
    
    building = await db.buildings.find_one(
        {"building_id": membership["building_id"]},
        {"_id": 0}
    )
    
    return {"membership": membership, "building": building}

@api_router.delete("/memberships/{membership_id}")
async def leave_building(membership_id: str, request: Request):
    user = await require_auth(request)
    
    result = await db.memberships.update_one(
        {"membership_id": membership_id, "user_id": user.user_id},
        {"$set": {"status": "inactive"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    return {"message": "Left building successfully"}

# ==================== DEALS ENDPOINTS (MULTI-TENANT) ====================

@api_router.get("/deals")
async def get_deals(
    request: Request,
    building_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None
):
    """Get deals - filtered by building_id for multi-tenant isolation"""
    user = await get_current_user(request)
    
    query = {}
    
    # Multi-tenant: Filter by building
    if building_id:
        query["building_id"] = building_id
    elif user and user.building_id:
        query["building_id"] = user.building_id
    
    if status:
        query["status"] = status
    else:
        query["status"] = {"$in": ["active", "locked", "completed"]}
    
    if category:
        query["category"] = category
    
    deals = await db.deals.find(query, {"_id": 0}).to_list(1000)
    
    for deal in deals:
        supplier = await db.suppliers.find_one(
            {"supplier_id": deal["supplier_id"]},
            {"_id": 0}
        )
        deal["supplier"] = supplier
        
        if user:
            participant = await db.deal_participants.find_one({
                "deal_id": deal["deal_id"],
                "user_id": user.user_id
            })
            deal["user_joined"] = participant is not None
        else:
            deal["user_joined"] = False
    
    return deals

@api_router.get("/deals/{deal_id}")
async def get_deal(deal_id: str, request: Request):
    deal = await db.deals.find_one({"deal_id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    supplier = await db.suppliers.find_one(
        {"supplier_id": deal["supplier_id"]},
        {"_id": 0}
    )
    deal["supplier"] = supplier
    
    participants = await db.deal_participants.find(
        {"deal_id": deal_id},
        {"_id": 0}
    ).to_list(1000)

    for participant in participants:
        user_doc = await db.users.find_one(
            {"user_id": participant["user_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1}
        )
        participant["user"] = user_doc

    deal["participants"] = participants
    
    user = await get_current_user(request)
    if user:
        participant = await db.deal_participants.find_one({
            "deal_id": deal_id,
            "user_id": user.user_id
        })
        deal["user_joined"] = participant is not None
    else:
        deal["user_joined"] = False
    
    return deal

@api_router.post("/deals")
async def create_deal(data: DealCreate, user: User = Depends(require_admin)):
    """Create a new deal (admin only)"""
    # Verify supplier exists
    supplier = await db.suppliers.find_one({"supplier_id": data.supplier_id})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Verify building exists
    building = await db.buildings.find_one({"building_id": data.building_id})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    
    current_price = data.original_price
    if data.tiers:
        sorted_tiers = sorted(data.tiers, key=lambda t: t.min_participants)
        current_price = sorted_tiers[0].price if sorted_tiers else data.original_price
    
    deal = Deal(
        deal_id=f"deal_{uuid.uuid4().hex[:12]}",
        current_price=current_price,
        current_participants=0,
        status="active",
        created_at=datetime.now(timezone.utc),
        **data.model_dump()
    )
    
    await db.deals.insert_one(deal.model_dump())
    logger.info(f"New deal created: {deal.deal_id} for building {data.building_id}")
    return deal.model_dump()

@api_router.put("/deals/{deal_id}")
async def update_deal(deal_id: str, data: DealUpdate, user: User = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Handle tiers update for price recalculation
    if "tiers" in update_data:
        deal = await db.deals.find_one({"deal_id": deal_id})
        if deal:
            tiers = update_data["tiers"]
            sorted_tiers = sorted(tiers, key=lambda t: t["min_participants"], reverse=True)
            current_participants = deal.get("current_participants", 0)
            new_price = deal.get("original_price", 0)
            for tier in sorted_tiers:
                if current_participants >= tier["min_participants"]:
                    new_price = tier["price"]
                    break
            update_data["current_price"] = new_price
    
    result = await db.deals.update_one(
        {"deal_id": deal_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    logger.info(f"Deal {deal_id} updated by admin {user.user_id}")
    return {"message": "Deal updated successfully"}

@api_router.post("/deals/{deal_id}/join")
async def join_deal(deal_id: str, request: Request):
    user = await require_auth(request)
    
    deal = await db.deals.find_one({"deal_id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Multi-tenant check: User can only join deals in their building
    if user.building_id and deal["building_id"] != user.building_id:
        raise HTTPException(status_code=403, detail="Cannot join deals from other buildings")
    
    if deal["status"] not in ["active", "locked"]:
        raise HTTPException(status_code=400, detail="Deal is not active")
    
    deadline = deal["deadline"]
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    if deadline < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Deal deadline has passed")
    
    existing = await db.deal_participants.find_one({
        "deal_id": deal_id,
        "user_id": user.user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already joined this deal")
    
    if deal["current_participants"] >= deal["max_participants"]:
        raise HTTPException(status_code=400, detail="Deal is full")
    
    participant_doc = {
        "participant_id": f"part_{uuid.uuid4().hex[:12]}",
        "deal_id": deal_id,
        "user_id": user.user_id,
        "building_id": deal["building_id"],
        "joined_at": datetime.now(timezone.utc),
        "status": "joined"
    }
    
    await db.deal_participants.insert_one(participant_doc)
    
    new_count = deal["current_participants"] + 1
    tiers = deal.get("tiers", [])
    new_price = deal["original_price"]
    for tier in sorted(tiers, key=lambda t: t["min_participants"], reverse=True):
        if new_count >= tier["min_participants"]:
            new_price = tier["price"]
            break
    
    new_status = deal.get("status", "active")
    if new_count >= deal["min_participants"] and new_status == "active":
        new_status = "locked"

    await db.deals.update_one(
        {"deal_id": deal_id},
        {"$set": {
            "current_participants": new_count,
            "current_price": new_price,
            "status": new_status
        }}
    )
    
    booking = {
        "booking_id": f"book_{uuid.uuid4().hex[:12]}",
        "deal_id": deal_id,
        "user_id": user.user_id,
        "building_id": deal["building_id"],
        "status": "pending",
        "service_date": deal.get("service_date"),
        "created_at": datetime.now(timezone.utc)
    }
    await db.bookings.insert_one(booking)
    
    logger.info(f"User {user.user_id} joined deal {deal_id}")
    participant_doc.pop("_id", None)
    return {"message": "Successfully joined deal", "participant": participant_doc}

@api_router.post("/deals/{deal_id}/leave")
async def leave_deal(deal_id: str, request: Request):
    user = await require_auth(request)
    
    deal = await db.deals.find_one({"deal_id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    result = await db.deal_participants.delete_one({
        "deal_id": deal_id,
        "user_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not a participant")
    
    new_count = max(0, deal["current_participants"] - 1)
    tiers = deal.get("tiers", [])
    new_price = deal["original_price"]
    for tier in sorted(tiers, key=lambda t: t["min_participants"], reverse=True):
        if new_count >= tier["min_participants"]:
            new_price = tier["price"]
            break
    
    new_status = deal.get("status", "active")
    if new_count < deal["min_participants"] and new_status == "locked":
        new_status = "active"

    await db.deals.update_one(
        {"deal_id": deal_id},
        {"$set": {
            "current_participants": new_count,
            "current_price": new_price,
            "status": new_status
        }}
    )
    
    await db.bookings.update_one(
        {"deal_id": deal_id, "user_id": user.user_id},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Successfully left deal"}

# ==================== BOOKINGS ENDPOINTS (MULTI-TENANT) ====================

@api_router.get("/bookings")
async def get_my_bookings(request: Request):
    user = await require_auth(request)
    
    # Multi-tenant: Only show bookings from user's building
    query = {"user_id": user.user_id}
    if user.building_id:
        query["building_id"] = user.building_id
    
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(1000)
    
    for booking in bookings:
        deal = await db.deals.find_one({"deal_id": booking["deal_id"]}, {"_id": 0})
        booking["deal"] = deal
        if deal:
            supplier = await db.suppliers.find_one(
                {"supplier_id": deal["supplier_id"]},
                {"_id": 0}
            )
            booking["supplier"] = supplier
    
    return bookings

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, request: Request):
    user = await require_auth(request)
    
    booking = await db.bookings.find_one(
        {"booking_id": booking_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    deal = await db.deals.find_one({"deal_id": booking["deal_id"]}, {"_id": 0})
    booking["deal"] = deal
    
    return booking

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, user: User = Depends(require_admin)):
    if status not in [s.value for s in BookingStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {"status": status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    logger.info(f"Booking {booking_id} status updated to {status} by admin {user.user_id}")
    return {"message": "Booking status updated"}

# ==================== SUPPLIERS ENDPOINTS ====================

@api_router.get("/suppliers")
async def get_suppliers(
    status: Optional[str] = None,
    category: Optional[str] = None,
    city: Optional[str] = None
):
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if city:
        query["cities_served"] = city
    
    suppliers = await db.suppliers.find(query, {"_id": 0}).to_list(1000)
    return suppliers

@api_router.get("/suppliers/{supplier_id}")
async def get_supplier(supplier_id: str):
    supplier = await db.suppliers.find_one({"supplier_id": supplier_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@api_router.post("/suppliers")
async def create_supplier(data: SupplierCreate, user: User = Depends(require_admin)):
    supplier = Supplier(
        supplier_id=f"sup_{uuid.uuid4().hex[:12]}",
        status="pending",
        created_at=datetime.now(timezone.utc),
        **data.model_dump()
    )
    
    await db.suppliers.insert_one(supplier.model_dump())
    logger.info(f"New supplier created: {supplier.supplier_id}")
    return supplier.model_dump()

@api_router.put("/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, data: SupplierUpdate, user: User = Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.suppliers.update_one(
        {"supplier_id": supplier_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    logger.info(f"Supplier {supplier_id} updated by admin {user.user_id}")
    return {"message": "Supplier updated successfully"}

@api_router.post("/suppliers/register")
async def register_supplier(data: SupplierCreate, request: Request):
    user = await require_auth(request)
    
    existing = await db.suppliers.find_one({"user_id": user.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already registered as supplier")
    
    supplier = Supplier(
        supplier_id=f"sup_{uuid.uuid4().hex[:12]}",
        user_id=user.user_id,
        status="pending",
        created_at=datetime.now(timezone.utc),
        **data.model_dump()
    )
    
    await db.suppliers.insert_one(supplier.model_dump())
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"role": "supplier"}}
    )
    
    logger.info(f"New supplier registered: {supplier.supplier_id}")
    return supplier.model_dump()

@api_router.get("/suppliers/my")
async def get_my_supplier(request: Request):
    user = await require_auth(request)
    
    supplier = await db.suppliers.find_one({"user_id": user.user_id}, {"_id": 0})
    if not supplier:
        return None
    
    deals = await db.deals.find(
        {"supplier_id": supplier["supplier_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    supplier["deals"] = deals
    return supplier

# ==================== PAYMENT ENDPOINTS ====================

@api_router.post("/payments/create")
@limiter.limit("10/minute")
async def create_payment(request: Request, data: PaymentCreate):
    user = await require_auth(request)
    
    payment_id = f"pay_{uuid.uuid4().hex[:12]}"
    building_id = user.building_id
    
    if data.type == "subscription":
        amount = SUBSCRIPTION_PRICE
        title = "Assinatura CondoClub - Mensal"
        description = "Assinatura mensal do CondoClub com acesso a todas as ofertas exclusivas"
    elif data.type == "deal_payment" and data.deal_id:
        deal = await db.deals.find_one({"deal_id": data.deal_id})
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        amount = deal["current_price"]
        title = f"Pagamento - {deal['title']}"
        description = deal["description"][:250]
        building_id = deal["building_id"]
    else:
        raise HTTPException(status_code=400, detail="Invalid payment type")
    
    payment = {
        "payment_id": payment_id,
        "user_id": user.user_id,
        "building_id": building_id,
        "deal_id": data.deal_id,
        "type": data.type,
        "amount": amount,
        "currency": "BRL",
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.payments.insert_one(payment)
    
    if MERCADOPAGO_ACCESS_TOKEN:
        try:
            import mercadopago
            sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN)
            
            preference_data = {
                "items": [{
                    "id": payment_id,
                    "title": title,
                    "description": description,
                    "quantity": 1,
                    "currency_id": "BRL",
                    "unit_price": float(amount)
                }],
                "payer": {"email": user.email},
                "back_urls": {
                    "success": f"{APP_URL}/payment/success?payment_id={payment_id}",
                    "failure": f"{APP_URL}/payment/failure?payment_id={payment_id}",
                    "pending": f"{APP_URL}/payment/pending?payment_id={payment_id}"
                },
                "auto_return": "approved",
                "external_reference": payment_id,
                "notification_url": f"{APP_URL}/api/payments/webhook"
            }
            
            preference_response = sdk.preference().create(preference_data)
            
            if preference_response["status"] == 201:
                preference = preference_response["response"]
                await db.payments.update_one(
                    {"payment_id": payment_id},
                    {"$set": {"preference_id": preference["id"]}}
                )
                logger.info(f"MercadoPago preference created: {preference['id']}")
                return {
                    "payment_id": payment_id,
                    "preference_id": preference["id"],
                    "init_point": preference["init_point"],
                    "sandbox_init_point": preference.get("sandbox_init_point"),
                    "amount": amount
                }
        except Exception as e:
            logger.error(f"MercadoPago exception: {e}")
    
    return {
        "payment_id": payment_id,
        "preference_id": None,
        "init_point": None,
        "sandbox_mode": True,
        "amount": amount,
        "message": "MercadoPago not configured. Use /payments/{payment_id}/simulate to test."
    }

@api_router.post("/payments/webhook")
async def payment_webhook(request: Request):
    try:
        body = await request.json()
        logger.info(f"Webhook received: {body}")
        
        if body.get("type") == "payment":
            payment_data = body.get("data", {})
            mp_payment_id = payment_data.get("id")
            
            if mp_payment_id and MERCADOPAGO_ACCESS_TOKEN:
                import mercadopago
                sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN)
                payment_info = sdk.payment().get(mp_payment_id)
                
                if payment_info["status"] == 200:
                    mp_payment = payment_info["response"]
                    external_ref = mp_payment.get("external_reference")
                    status = mp_payment.get("status")
                    
                    if external_ref:
                        new_status = "approved" if status == "approved" else status
                        await db.payments.update_one(
                            {"payment_id": external_ref},
                            {"$set": {
                                "mercadopago_id": str(mp_payment_id),
                                "mercadopago_status": status,
                                "status": new_status,
                                "updated_at": datetime.now(timezone.utc)
                            }}
                        )
                        if status == "approved":
                            await process_approved_payment(external_ref)
                        logger.info(f"Payment {external_ref} updated to {new_status}")
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

async def process_approved_payment(payment_id: str):
    payment = await db.payments.find_one({"payment_id": payment_id})
    if not payment:
        return
    
    if payment["type"] == "subscription":
        subscription = {
            "subscription_id": f"sub_{uuid.uuid4().hex[:12]}",
            "user_id": payment["user_id"],
            "building_id": payment.get("building_id"),
            "payment_id": payment_id,
            "status": "active",
            "plan": "basic",
            "price": SUBSCRIPTION_PRICE,
            "started_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30)
        }
        await db.subscriptions.insert_one(subscription)
        await db.users.update_one(
            {"user_id": payment["user_id"]},
            {"$set": {"subscription_status": "active"}}
        )
        logger.info(f"Subscription created for user {payment['user_id']}")
        
    elif payment["type"] == "deal_payment" and payment.get("deal_id"):
        await db.bookings.update_one(
            {"deal_id": payment["deal_id"], "user_id": payment["user_id"]},
            {"$set": {"status": "confirmed", "payment_id": payment_id}}
        )
        await db.deal_participants.update_one(
            {"deal_id": payment["deal_id"], "user_id": payment["user_id"]},
            {"$set": {"status": "paid", "payment_id": payment_id}}
        )
        logger.info(f"Deal payment confirmed for user {payment['user_id']}")
    
    transaction = {
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "user_id": payment["user_id"],
        "building_id": payment.get("building_id"),
        "deal_id": payment.get("deal_id"),
        "payment_id": payment_id,
        "type": payment["type"],
        "amount": payment["amount"],
        "status": "completed",
        "created_at": datetime.now(timezone.utc)
    }
    await db.transactions.insert_one(transaction)

@api_router.post("/payments/{payment_id}/simulate")
@limiter.limit("20/minute")
async def simulate_payment(payment_id: str, request: Request, status: str = "approved"):
    user = await require_auth(request)
    
    payment = await db.payments.find_one({
        "payment_id": payment_id,
        "user_id": user.user_id
    })
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] != "pending":
        raise HTTPException(status_code=400, detail="Payment already processed")
    
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.payments.update_one(
        {"payment_id": payment_id},
        {"$set": {
            "status": status,
            "mercadopago_status": status,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    if status == "approved":
        await process_approved_payment(payment_id)
    
    return {"message": f"Payment {status}", "payment_id": payment_id}

@api_router.get("/payments")
async def get_my_payments(request: Request):
    user = await require_auth(request)
    payments = await db.payments.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    return payments

@api_router.get("/payments/{payment_id}")
async def get_payment(payment_id: str, request: Request):
    user = await require_auth(request)
    payment = await db.payments.find_one(
        {"payment_id": payment_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

# ==================== SUBSCRIPTION ENDPOINTS ====================

@api_router.get("/subscriptions/my")
async def get_my_subscription(request: Request):
    user = await require_auth(request)
    subscription = await db.subscriptions.find_one(
        {"user_id": user.user_id, "status": "active"},
        {"_id": 0}
    )
    return subscription

@api_router.post("/subscriptions/subscribe")
async def subscribe(request: Request):
    user = await require_auth(request)
    existing = await db.subscriptions.find_one({
        "user_id": user.user_id,
        "status": "active"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already subscribed")
    
    payment_data = PaymentCreate(type="subscription")
    return await create_payment(request, payment_data)

# ==================== ADMIN DASHBOARD ENDPOINTS ====================

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(user: User = Depends(require_admin)):
    """Get comprehensive admin dashboard metrics"""
    
    # Overall metrics
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"status": "active"})
    total_buildings = await db.buildings.count_documents({})
    active_buildings = await db.buildings.count_documents({"status": "active"})
    total_deals = await db.deals.count_documents({})
    active_deals = await db.deals.count_documents({"status": "active"})
    total_bookings = await db.bookings.count_documents({})
    confirmed_bookings = await db.bookings.count_documents({"status": "confirmed"})
    total_suppliers = await db.suppliers.count_documents({})
    approved_suppliers = await db.suppliers.count_documents({"status": "approved"})
    pending_suppliers = await db.suppliers.count_documents({"status": "pending"})
    active_subscriptions = await db.subscriptions.count_documents({"status": "active"})
    
    # Financial metrics
    transactions = await db.transactions.find({"status": "completed"}).to_list(10000)
    gmv = sum(t["amount"] for t in transactions)
    
    subscription_revenue = sum(t["amount"] for t in transactions if t["type"] == "subscription")
    deal_revenue = sum(t["amount"] for t in transactions if t["type"] == "deal_payment")
    
    # Calculate platform commission (assume 10% of deal_revenue)
    platform_revenue = subscription_revenue + (deal_revenue * 0.10)
    
    # Metrics by building
    buildings = await db.buildings.find({}, {"_id": 0}).to_list(1000)
    building_metrics = []
    
    for building in buildings:
        b_id = building["building_id"]
        residents = await db.memberships.count_documents({"building_id": b_id, "status": "active"})
        b_deals = await db.deals.count_documents({"building_id": b_id, "status": "active"})
        b_bookings = await db.bookings.count_documents({"building_id": b_id})
        
        b_transactions = await db.transactions.find({
            "building_id": b_id,
            "status": "completed"
        }).to_list(10000)
        b_gmv = sum(t["amount"] for t in b_transactions)
        
        building_metrics.append({
            "building_id": b_id,
            "name": building["name"],
            "city": building["city"],
            "status": building["status"],
            "residents": residents,
            "active_deals": b_deals,
            "total_bookings": b_bookings,
            "gmv": b_gmv
        })
    
    # Recent activity
    recent_users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    recent_bookings = await db.bookings.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "overview": {
            "total_users": total_users,
            "active_users": active_users,
            "total_buildings": total_buildings,
            "active_buildings": active_buildings,
            "total_deals": total_deals,
            "active_deals": active_deals,
            "total_bookings": total_bookings,
            "confirmed_bookings": confirmed_bookings,
            "total_suppliers": total_suppliers,
            "approved_suppliers": approved_suppliers,
            "pending_suppliers": pending_suppliers,
            "active_subscriptions": active_subscriptions
        },
        "financial": {
            "gmv": gmv,
            "subscription_revenue": subscription_revenue,
            "deal_revenue": deal_revenue,
            "platform_revenue": platform_revenue
        },
        "buildings": building_metrics,
        "recent_users": recent_users,
        "recent_bookings": recent_bookings
    }

@api_router.get("/admin/users")
async def get_all_users(
    user: User = Depends(require_admin),
    building_id: Optional[str] = None,
    status: Optional[str] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all users with filtering"""
    query = {}
    
    if status:
        query["status"] = status
    if role:
        query["role"] = role
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    users = await db.users.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    # Add building info
    for u in users:
        membership = await db.memberships.find_one(
            {"user_id": u["user_id"], "status": "active"},
            {"_id": 0}
        )
        if membership:
            building = await db.buildings.find_one(
                {"building_id": membership["building_id"]},
                {"_id": 0, "building_id": 1, "name": 1}
            )
            u["building"] = building
            u["unit_number"] = membership.get("unit_number")
    
    # Filter by building if specified
    if building_id:
        users = [u for u in users if u.get("building", {}).get("building_id") == building_id]
    
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total, "skip": skip, "limit": limit}

@api_router.put("/admin/users/{user_id}")
async def update_user_admin(user_id: str, request: Request, admin: User = Depends(require_admin)):
    body = await request.json()
    
    allowed_fields = ["name", "role", "status"]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    
    if "role" in update_data and update_data["role"] not in [r.value for r in UserRole]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    if "status" in update_data and update_data["status"] not in ["active", "blocked", "deleted"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"User {user_id} updated by admin {admin.user_id}: {update_data}")
    return {"message": "User updated successfully"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user_admin(user_id: str, admin: User = Depends(require_super_admin)):
    """Delete user (super admin only)"""
    # Don't allow self-deletion
    if user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Soft delete
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"status": "deleted"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"User {user_id} deleted by admin {admin.user_id}")
    return {"message": "User deleted successfully"}

@api_router.get("/admin/buildings")
async def get_all_buildings(
    user: User = Depends(require_admin),
    status: Optional[str] = None,
    city: Optional[str] = None
):
    query = {}
    if status:
        query["status"] = status
    if city:
        query["city"] = city
    
    buildings = await db.buildings.find(query, {"_id": 0}).to_list(1000)
    
    for building in buildings:
        resident_count = await db.memberships.count_documents({
            "building_id": building["building_id"],
            "status": "active"
        })
        building["resident_count"] = resident_count
    
    return buildings

@api_router.get("/admin/suppliers")
async def get_all_suppliers(
    user: User = Depends(require_admin),
    status: Optional[str] = None,
    category: Optional[str] = None
):
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    
    suppliers = await db.suppliers.find(query, {"_id": 0}).to_list(1000)
    return suppliers

@api_router.get("/admin/deals")
async def get_all_deals(
    user: User = Depends(require_admin),
    building_id: Optional[str] = None,
    status: Optional[str] = None,
    supplier_id: Optional[str] = None
):
    query = {}
    if building_id:
        query["building_id"] = building_id
    if status:
        query["status"] = status
    if supplier_id:
        query["supplier_id"] = supplier_id
    
    deals = await db.deals.find(query, {"_id": 0}).to_list(1000)
    
    for deal in deals:
        supplier = await db.suppliers.find_one(
            {"supplier_id": deal["supplier_id"]},
            {"_id": 0, "supplier_id": 1, "company_name": 1}
        )
        deal["supplier"] = supplier
        
        building = await db.buildings.find_one(
            {"building_id": deal["building_id"]},
            {"_id": 0, "building_id": 1, "name": 1}
        )
        deal["building"] = building
    
    return deals

@api_router.get("/admin/bookings")
async def get_all_bookings(
    user: User = Depends(require_admin),
    building_id: Optional[str] = None,
    status: Optional[str] = None,
    deal_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    query = {}
    if building_id:
        query["building_id"] = building_id
    if status:
        query["status"] = status
    if deal_id:
        query["deal_id"] = deal_id
    
    bookings = await db.bookings.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for booking in bookings:
        user_doc = await db.users.find_one(
            {"user_id": booking["user_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1}
        )
        booking["user"] = user_doc
        
        deal = await db.deals.find_one(
            {"deal_id": booking["deal_id"]},
            {"_id": 0, "deal_id": 1, "title": 1}
        )
        booking["deal"] = deal
    
    total = await db.bookings.count_documents(query)
    return {"bookings": bookings, "total": total, "skip": skip, "limit": limit}

@api_router.get("/admin/payments")
async def get_all_payments(
    user: User = Depends(require_admin),
    building_id: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    query = {}
    if building_id:
        query["building_id"] = building_id
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    
    payments = await db.payments.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for payment in payments:
        user_doc = await db.users.find_one(
            {"user_id": payment["user_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1}
        )
        payment["user"] = user_doc
    
    total = await db.payments.count_documents(query)
    return {"payments": payments, "total": total, "skip": skip, "limit": limit}

@api_router.get("/admin/transactions")
async def get_all_transactions(
    user: User = Depends(require_admin),
    building_id: Optional[str] = None,
    type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    query = {"status": "completed"}
    if building_id:
        query["building_id"] = building_id
    if type:
        query["type"] = type
    
    transactions = await db.transactions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.transactions.count_documents(query)
    gmv = sum(t["amount"] for t in transactions)
    
    return {
        "transactions": transactions,
        "total": total,
        "gmv": gmv,
        "skip": skip,
        "limit": limit
    }

@api_router.get("/admin/export/financial")
async def export_financial_report(
    user: User = Depends(require_admin),
    building_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Export financial report"""
    query = {"status": "completed"}
    
    if building_id:
        query["building_id"] = building_id
    
    if start_date:
        query["created_at"] = {"$gte": datetime.fromisoformat(start_date)}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["created_at"] = {"$lte": datetime.fromisoformat(end_date)}
    
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    
    total_gmv = sum(t["amount"] for t in transactions)
    subscription_revenue = sum(t["amount"] for t in transactions if t["type"] == "subscription")
    deal_revenue = sum(t["amount"] for t in transactions if t["type"] == "deal_payment")
    platform_commission = deal_revenue * 0.10
    
    return {
        "period": {
            "start": start_date,
            "end": end_date,
            "building_id": building_id
        },
        "summary": {
            "total_transactions": len(transactions),
            "gmv": total_gmv,
            "subscription_revenue": subscription_revenue,
            "deal_revenue": deal_revenue,
            "platform_commission": platform_commission,
            "total_platform_revenue": subscription_revenue + platform_commission
        },
        "transactions": transactions
    }

# ==================== FEATURE FLAGS ====================

@api_router.get("/buildings/{building_id}/features")
async def get_building_features(building_id: str):
    building = await db.buildings.find_one({"building_id": building_id}, {"_id": 0})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    return building.get("features", {})

@api_router.put("/buildings/{building_id}/features")
async def update_building_features(building_id: str, request: Request, user: User = Depends(require_admin)):
    features = await request.json()
    
    result = await db.buildings.update_one(
        {"building_id": building_id},
        {"$set": {"features": features}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Building not found")
    
    logger.info(f"Building {building_id} features updated by admin {user.user_id}")
    return {"message": "Features updated successfully"}

# ==================== LEGAL ====================

PRIVACY_POLICY_HTML = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Política de Privacidade - CondoClub</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
        h1 { color: #2563EB; }
        h2 { color: #1565C0; margin-top: 30px; }
        .date { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <h1>Política de Privacidade</h1>
    <p class="date">Última atualização: Janeiro 2025</p>
    <h2>1. Informações que Coletamos</h2>
    <p>O CondoClub coleta as seguintes informações:</p>
    <ul>
        <li><strong>Dados de cadastro:</strong> nome, e-mail, número da unidade</li>
        <li><strong>Dados de autenticação:</strong> informações do Google (quando usa login social)</li>
        <li><strong>Dados de uso:</strong> ofertas visualizadas, participações em ofertas</li>
        <li><strong>Dados de pagamento:</strong> histórico de transações (processados via MercadoPago)</li>
    </ul>
    <h2>2. Como Usamos suas Informações</h2>
    <ul>
        <li>Fornecer acesso às ofertas exclusivas do seu condomínio</li>
        <li>Processar pagamentos e gerenciar assinaturas</li>
        <li>Enviar notificações sobre ofertas e serviços</li>
    </ul>
    <h2>3. Compartilhamento de Dados</h2>
    <p>Compartilhamos dados apenas com fornecedores (para serviços), MercadoPago (pagamentos) e Google (autenticação).</p>
    <h2>4. Seus Direitos</h2>
    <p>Você pode acessar, corrigir, exportar ou excluir seus dados a qualquer momento.</p>
    <h2>5. Exclusão de Conta</h2>
    <p>Exclua sua conta em Perfil → Excluir Conta. Todos os dados serão permanentemente removidos.</p>
    <h2>6. Contato</h2>
    <p>privacidade@condoclub.com.br</p>
</body>
</html>
"""

@api_router.get("/legal/privacy", response_class=HTMLResponse)
async def get_privacy_policy():
    return PRIVACY_POLICY_HTML

@api_router.get("/legal/terms", response_class=HTMLResponse)
async def get_terms():
    return """
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Termos de Uso - CondoClub</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
            h1 { color: #2563EB; }
            h2 { color: #1D4ED8; margin-top: 30px; }
        </style>
    </head>
    <body>
        <h1>Termos de Uso</h1>
        <p>Última atualização: Janeiro 2025</p>
        <h2>1. Aceitação</h2>
        <p>Ao usar o CondoClub, você concorda com estes termos.</p>
        <h2>2. Serviço</h2>
        <p>Plataforma de compras coletivas para moradores de condomínios.</p>
        <h2>3. Elegibilidade</h2>
        <p>Maiores de 18 anos, moradores de condomínios cadastrados.</p>
        <h2>4. Assinatura</h2>
        <p>R$19,90/mês. Cancele quando quiser.</p>
        <h2>5. Pagamentos</h2>
        <p>Processados via MercadoPago.</p>
        <h2>6. Contato</h2>
        <p>suporte@condoclub.com.br</p>
    </body>
    </html>
    """

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    existing = await db.buildings.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    # Create buildings with features
    buildings = [
        {
            "building_id": "bld_demo001",
            "name": "Residencial Aurora",
            "address": "Rua das Flores, 123",
            "city": "São Paulo",
            "state": "SP",
            "zip_code": "01310-100",
            "unit_count": 120,
            "invite_code": "AURORA23",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "image_url": None,
            "features": {
                "marketplace_enabled": True,
                "car_wash_enabled": True,
                "wine_club_enabled": False
            }
        },
        {
            "building_id": "bld_demo002",
            "name": "Edifício Horizonte",
            "address": "Av. Paulista, 1000",
            "city": "São Paulo",
            "state": "SP",
            "zip_code": "01310-200",
            "unit_count": 80,
            "invite_code": "HORIZ24",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "image_url": None,
            "features": {
                "marketplace_enabled": True,
                "car_wash_enabled": False,
                "wine_club_enabled": True
            }
        },
        {
            "building_id": "bld_demo003",
            "name": "Condomínio Vista Mar",
            "address": "Rua da Praia, 500",
            "city": "Rio de Janeiro",
            "state": "RJ",
            "zip_code": "22041-080",
            "unit_count": 200,
            "invite_code": "VISTA25",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "image_url": None,
            "features": {
                "marketplace_enabled": True,
                "car_wash_enabled": True,
                "wine_club_enabled": True
            }
        }
    ]
    await db.buildings.insert_many(buildings)
    
    # Create admin user
    admin_user = {
        "user_id": "user_admin001",
        "email": "admin@condoclub.com",
        "name": "Admin CondoClub",
        "picture": None,
        "role": "admin",
        "created_at": datetime.now(timezone.utc),
        "subscription_status": "active",
        "auth_provider": "email",
        "password_hash": hash_password("Admin123!"),
        "status": "active"
    }
    await db.users.insert_one(admin_user)
    
    # Create operator user
    operator_user = {
        "user_id": "user_operator001",
        "email": "operator@condoclub.com",
        "name": "Operator CondoClub",
        "picture": None,
        "role": "operator",
        "created_at": datetime.now(timezone.utc),
        "subscription_status": "active",
        "auth_provider": "email",
        "password_hash": hash_password("Operator123!"),
        "status": "active"
    }
    await db.users.insert_one(operator_user)
    
    # Create suppliers
    suppliers = [
        {
            "supplier_id": "sup_demo001",
            "company_name": "LimpaSofá Premium",
            "description": "Limpeza profissional de sofás e estofados com produtos antialérgicos",
            "category": "Limpeza",
            "status": "approved",
            "created_at": datetime.now(timezone.utc),
            "phone": "(11) 99999-0001",
            "email": "contato@limpasofa.com",
            "cities_served": ["São Paulo", "Rio de Janeiro"],
            "rating": 4.8,
            "total_reviews": 156
        },
        {
            "supplier_id": "sup_demo002",
            "company_name": "TechFix Solutions",
            "description": "Manutenção de ar condicionado e eletrodomésticos",
            "category": "Manutenção",
            "status": "approved",
            "created_at": datetime.now(timezone.utc),
            "phone": "(11) 99999-0002",
            "email": "contato@techfix.com",
            "cities_served": ["São Paulo"],
            "rating": 4.6,
            "total_reviews": 89
        },
        {
            "supplier_id": "sup_demo003",
            "company_name": "Pet Care Express",
            "description": "Banho e tosa profissional para pets",
            "category": "Pet",
            "status": "approved",
            "created_at": datetime.now(timezone.utc),
            "phone": "(11) 99999-0003",
            "email": "contato@petcare.com",
            "cities_served": ["São Paulo", "Rio de Janeiro"],
            "rating": 4.9,
            "total_reviews": 234
        },
        {
            "supplier_id": "sup_demo004",
            "company_name": "Auto Wash Premium",
            "description": "Lavagem automotiva completa no seu condomínio",
            "category": "Automotivo",
            "status": "approved",
            "created_at": datetime.now(timezone.utc),
            "phone": "(11) 99999-0004",
            "email": "contato@autowash.com",
            "cities_served": ["São Paulo"],
            "rating": 4.7,
            "total_reviews": 67
        }
    ]
    await db.suppliers.insert_many(suppliers)
    
    # Create deals for each building
    deals = [
        {
            "deal_id": "deal_demo001",
            "supplier_id": "sup_demo001",
            "building_id": "bld_demo001",
            "title": "Limpeza de Sofá",
            "description": "Limpeza profunda de sofá de até 4 lugares com higienização completa",
            "category": "Limpeza",
            "original_price": 400.00,
            "tiers": [
                {"min_participants": 3, "price": 320.00, "discount_percent": 20},
                {"min_participants": 5, "price": 280.00, "discount_percent": 30},
                {"min_participants": 10, "price": 220.00, "discount_percent": 45}
            ],
            "current_price": 400.00,
            "min_participants": 3,
            "max_participants": 20,
            "current_participants": 0,
            "status": "active",
            "service_date": datetime.now(timezone.utc) + timedelta(days=14),
            "deadline": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        },
        {
            "deal_id": "deal_demo002",
            "supplier_id": "sup_demo002",
            "building_id": "bld_demo001",
            "title": "Manutenção de Ar Condicionado",
            "description": "Limpeza completa e manutenção preventiva do ar condicionado split",
            "category": "Manutenção",
            "original_price": 250.00,
            "tiers": [
                {"min_participants": 5, "price": 200.00, "discount_percent": 20},
                {"min_participants": 10, "price": 175.00, "discount_percent": 30},
                {"min_participants": 15, "price": 150.00, "discount_percent": 40}
            ],
            "current_price": 250.00,
            "min_participants": 5,
            "max_participants": 30,
            "current_participants": 0,
            "status": "active",
            "service_date": datetime.now(timezone.utc) + timedelta(days=21),
            "deadline": datetime.now(timezone.utc) + timedelta(days=14),
            "created_at": datetime.now(timezone.utc)
        },
        {
            "deal_id": "deal_demo003",
            "supplier_id": "sup_demo003",
            "building_id": "bld_demo001",
            "title": "Banho e Tosa - Pets",
            "description": "Banho e tosa completo para cães de pequeno e médio porte",
            "category": "Pet",
            "original_price": 120.00,
            "tiers": [
                {"min_participants": 5, "price": 95.00, "discount_percent": 21},
                {"min_participants": 10, "price": 80.00, "discount_percent": 33},
                {"min_participants": 15, "price": 70.00, "discount_percent": 42}
            ],
            "current_price": 120.00,
            "min_participants": 5,
            "max_participants": 25,
            "current_participants": 0,
            "status": "active",
            "service_date": datetime.now(timezone.utc) + timedelta(days=10),
            "deadline": datetime.now(timezone.utc) + timedelta(days=5),
            "created_at": datetime.now(timezone.utc)
        },
        {
            "deal_id": "deal_demo004",
            "supplier_id": "sup_demo004",
            "building_id": "bld_demo002",
            "title": "Lavagem Automotiva Completa",
            "description": "Lavagem interna e externa com cera e higienização",
            "category": "Automotivo",
            "original_price": 180.00,
            "tiers": [
                {"min_participants": 5, "price": 140.00, "discount_percent": 22},
                {"min_participants": 10, "price": 120.00, "discount_percent": 33},
                {"min_participants": 20, "price": 100.00, "discount_percent": 44}
            ],
            "current_price": 180.00,
            "min_participants": 5,
            "max_participants": 40,
            "current_participants": 0,
            "status": "active",
            "service_date": datetime.now(timezone.utc) + timedelta(days=7),
            "deadline": datetime.now(timezone.utc) + timedelta(days=3),
            "created_at": datetime.now(timezone.utc)
        }
    ]
    await db.deals.insert_many(deals)
    
    # Create indexes for multi-tenant performance
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("status")
    await db.buildings.create_index("building_id", unique=True)
    await db.buildings.create_index("invite_code", unique=True)
    await db.buildings.create_index("status")
    await db.deals.create_index("deal_id", unique=True)
    await db.deals.create_index("building_id")
    await db.deals.create_index("status")
    await db.deals.create_index([("building_id", 1), ("status", 1)])
    await db.memberships.create_index("user_id")
    await db.memberships.create_index("building_id")
    await db.memberships.create_index([("user_id", 1), ("status", 1)])
    await db.bookings.create_index("user_id")
    await db.bookings.create_index("building_id")
    await db.bookings.create_index("deal_id")
    await db.bookings.create_index([("building_id", 1), ("status", 1)])
    await db.payments.create_index("payment_id", unique=True)
    await db.payments.create_index("user_id")
    await db.payments.create_index("building_id")
    await db.subscriptions.create_index("user_id")
    await db.subscriptions.create_index("building_id")
    await db.transactions.create_index("user_id")
    await db.transactions.create_index("building_id")
    await db.transactions.create_index([("building_id", 1), ("status", 1)])
    await db.suppliers.create_index("supplier_id", unique=True)
    await db.suppliers.create_index("status")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.deal_participants.create_index([("deal_id", 1), ("user_id", 1)], unique=True)
    
    logger.info("Seed data and indexes created successfully")
    return {"message": "Seed data created successfully"}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {
        "message": "CondoClub API",
        "version": "3.0.0",
        "status": "production-ready",
        "architecture": "multi-tenant"
    }

@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "mercadopago": "configured" if MERCADOPAGO_ACCESS_TOKEN else "sandbox",
        "version": "3.0.0"
    }

# ==================== APP SETUP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("CondoClub API v3.0 starting up...")
    logger.info(f"MercadoPago configured: {bool(MERCADOPAGO_ACCESS_TOKEN)}")
    logger.info("Multi-tenant architecture enabled")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("CondoClub API shutting down...")
