# CondoClub - Complete Operational Guide

## Table of Contents
1. [Local Development](#1-local-development)
2. [MongoDB Atlas Setup](#2-mongodb-atlas-setup)
3. [MercadoPago Configuration](#3-mercadopago-configuration)
4. [Backend Deployment (Railway)](#4-backend-deployment-railway)
5. [Mobile App Building](#5-mobile-app-building)
6. [Publishing to Stores](#6-publishing-to-stores)
7. [Testing Scenarios](#7-testing-scenarios)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Local Development

### Backend Setup

```bash
# Clone repository and navigate to backend
cd /app/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env

# Run the server
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**Test the API:**
```bash
# Health check
curl http://localhost:8001/api/health

# API documentation
open http://localhost:8001/docs
```

### Frontend Setup

```bash
# Navigate to frontend
cd /app/frontend

# Install dependencies
yarn install

# Copy environment file
cp .env.example .env

# Edit .env with your backend URL
nano .env

# Start development server
npx expo start
```

---

## 2. MongoDB Atlas Setup

### Step 1: Create Account
1. Go to https://cloud.mongodb.com
2. Sign up or log in

### Step 2: Create Cluster
1. Click "Build a Database"
2. Choose "FREE" tier (M0 Sandbox)
3. Select provider: AWS
4. Select region: São Paulo (sa-east-1)
5. Name cluster: "condoclub-prod"
6. Click "Create Cluster"

### Step 3: Create Database User
1. Go to "Database Access"
2. Click "Add New Database User"
3. Username: `condoclub_admin`
4. Password: Generate secure password
5. Role: "Read and write to any database"
6. Click "Add User"

### Step 4: Configure Network Access
1. Go to "Network Access"
2. Click "Add IP Address"
3. For production: Add your server IPs
4. For testing: Click "Allow Access from Anywhere" (0.0.0.0/0)

### Step 5: Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your password
5. Replace `<dbname>` with `condoclub`

**Example:**
```
mongodb+srv://condoclub_admin:YOUR_PASSWORD@condoclub-prod.xxxxx.mongodb.net/condoclub?retryWrites=true&w=majority
```

### Step 6: Update Backend .env
```env
MONGO_URL=mongodb+srv://condoclub_admin:YOUR_PASSWORD@condoclub-prod.xxxxx.mongodb.net/condoclub?retryWrites=true&w=majority
DB_NAME=condoclub
```

---

## 3. MercadoPago Configuration

### Step 1: Create Account
1. Go to https://www.mercadopago.com.br
2. Create business account

### Step 2: Create Application
1. Go to https://www.mercadopago.com.br/developers/panel
2. Click "Criar aplicação"
3. Name: "CondoClub"
4. Select: "Checkout Pro" + "Pagamentos online"

### Step 3: Get Credentials
1. Go to "Credenciais" section
2. For testing, use "TEST" credentials
3. For production, use "PROD" credentials

### Step 4: Configure Webhook
1. Go to "Webhooks"
2. Add URL: `https://your-backend.com/api/payments/webhook`
3. Select events:
   - `payment.created`
   - `payment.updated`
4. Copy webhook secret

### Step 5: Update Backend .env
```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxx-xxxxx-xxxxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxx-xxxxx-xxxxx
MERCADOPAGO_WEBHOOK_SECRET=your-webhook-secret
```

### Sandbox Testing
Without MercadoPago credentials, payments work in sandbox mode:
```bash
# Create payment
curl -X POST http://localhost:8001/api/payments/create \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "subscription"}'

# Simulate approval
curl -X POST http://localhost:8001/api/payments/PAYMENT_ID/simulate \
  -H "Authorization: Bearer TOKEN"
```

---

## 4. Backend Deployment (Railway)

### Step 1: Prepare Repository
Ensure these files exist in `/app/backend`:
- `server.py` - Main application
- `requirements.txt` - Dependencies
- `Procfile` - Start command
- `railway.json` - Railway config

### Step 2: Deploy to Railway
1. Go to https://railway.app
2. Click "Start a New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository
5. Choose the `/backend` directory

### Step 3: Add Environment Variables
In Railway dashboard, add:
```
MONGO_URL=mongodb+srv://...
DB_NAME=condoclub
JWT_SECRET=your-secure-secret
MERCADOPAGO_ACCESS_TOKEN=...
MERCADOPAGO_PUBLIC_KEY=...
MERCADOPAGO_WEBHOOK_SECRET=...
APP_URL=https://your-frontend.com
```

### Step 4: Configure Domain
1. Go to Settings → Domains
2. Generate Railway domain or add custom domain
3. Update frontend `.env` with new API URL

### Alternative: Render Deployment

1. Go to https://render.com
2. Create "Web Service"
3. Connect repository
4. Configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (same as Railway)

---

## 5. Mobile App Building

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
npx eas login
```

### Step 3: Configure EAS
```bash
cd /app/frontend
npx eas build:configure
```

### Step 4: Update app.json
Verify these settings in `app.json`:
```json
{
  "expo": {
    "name": "CondoClub",
    "slug": "condoclub",
    "version": "2.0.0",
    "ios": {
      "bundleIdentifier": "com.condoclub.app"
    },
    "android": {
      "package": "com.condoclub.app"
    }
  }
}
```

### Step 5: Build Android
```bash
# Preview APK (for testing)
eas build --platform android --profile preview

# Production AAB (for Play Store)
eas build --platform android --profile production
```

### Step 6: Build iOS
```bash
# Simulator build
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
```

---

## 6. Publishing to Stores

### Google Play Store

**Prerequisites:**
- Google Play Developer Account ($25)
- App icon (512x512 PNG)
- Feature graphic (1024x500 PNG)
- Screenshots (phone + tablet)

**Steps:**
1. Go to https://play.google.com/console
2. Create new app
3. Fill app details:
   - App name: CondoClub
   - Language: Portuguese (Brazil)
   - Category: Shopping
4. Upload AAB from EAS
5. Complete content rating
6. Add privacy policy URL: `https://your-api.com/api/legal/privacy`
7. Submit for review

**Submit via CLI:**
```bash
eas submit --platform android --profile production
```

### Apple App Store

**Prerequisites:**
- Apple Developer Account ($99/year)
- App icon (1024x1024 PNG)
- Screenshots (all device sizes)

**Steps:**
1. Go to https://appstoreconnect.apple.com
2. Create new app
3. Bundle ID: `com.condoclub.app`
4. Fill metadata
5. Upload build from EAS
6. Add privacy policy URL
7. Submit for review

**Submit via CLI:**
```bash
eas submit --platform ios --profile production
```

---

## 7. Testing Scenarios

### Test Buildings
| Building | Invite Code | City |
|----------|-------------|------|
| Residencial Aurora | AURORA23 | São Paulo |
| Edifício Horizonte | HORIZ24 | São Paulo |
| Condomínio Vista Mar | VISTA25 | Rio de Janeiro |

### Admin Account (Seeded)
- Email: admin@condoclub.com
- Password: Admin123!

### Complete User Journey Test

```bash
# 1. Register
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "Test1234"}'

# Save TOKEN from response

# 2. Join building
curl -X POST http://localhost:8001/api/memberships \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invite_code": "AURORA23", "unit_number": "101"}'

# 3. View deals
curl http://localhost:8001/api/deals \
  -H "Authorization: Bearer TOKEN"

# 4. Join deal
curl -X POST http://localhost:8001/api/deals/deal_demo001/join \
  -H "Authorization: Bearer TOKEN"

# 5. Create payment
curl -X POST http://localhost:8001/api/payments/create \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "deal_payment", "deal_id": "deal_demo001"}'

# 6. Simulate payment (sandbox)
curl -X POST "http://localhost:8001/api/payments/PAY_ID/simulate?status=approved" \
  -H "Authorization: Bearer TOKEN"

# 7. Check booking confirmed
curl http://localhost:8001/api/bookings \
  -H "Authorization: Bearer TOKEN"

# 8. Delete account
curl -X DELETE http://localhost:8001/api/auth/account \
  -H "Authorization: Bearer TOKEN"
```

---

## 8. Troubleshooting

### Common Issues

**"MongoDB connection failed"**
- Check MONGO_URL format
- Verify IP whitelist in Atlas
- Test connection: `mongosh "YOUR_MONGO_URL"`

**"Authentication failed"**
- Verify JWT_SECRET is set
- Check token hasn't expired (7 days)
- Clear app storage and re-login

**"Rate limit exceeded"**
- Wait 1 minute
- Rate limits: 5/min for register, 10/min for login

**"Payment not processing"**
- Check MercadoPago credentials
- Use sandbox mode for testing
- Verify webhook URL is accessible

**"App Store rejection"**
- Ensure privacy policy is accessible
- Test account deletion works
- Both login methods must work

### Logs

**Backend logs:**
```bash
tail -f /var/log/supervisor/backend.err.log
```

**Frontend logs:**
```bash
npx expo start --dev-client
```

### Health Check

```bash
curl http://localhost:8001/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "healthy",
  "mercadopago": "sandbox" // or "configured"
}
```

---

## Quick Reference

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/register` | POST | Register with email |
| `/api/auth/login` | POST | Login with email |
| `/api/auth/session` | POST | Exchange OAuth session |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/account` | DELETE | Delete account |
| `/api/buildings` | GET | List buildings |
| `/api/memberships` | POST | Join building |
| `/api/deals` | GET | List deals |
| `/api/deals/{id}/join` | POST | Join deal |
| `/api/bookings` | GET | List bookings |
| `/api/payments/create` | POST | Create payment |
| `/api/payments/{id}/simulate` | POST | Simulate payment |
| `/api/legal/privacy` | GET | Privacy policy |
| `/api/legal/terms` | GET | Terms of service |

### Environment Variables

**Backend:**
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret for JWT tokens
- `MERCADOPAGO_ACCESS_TOKEN` - MercadoPago token
- `MERCADOPAGO_PUBLIC_KEY` - MercadoPago public key
- `MERCADOPAGO_WEBHOOK_SECRET` - Webhook secret
- `APP_URL` - Frontend URL

**Frontend:**
- `EXPO_PUBLIC_BACKEND_URL` - Backend API URL

---

## Support

For technical issues:
- Email: suporte@condoclub.com.br
- Privacy: privacidade@condoclub.com.br
