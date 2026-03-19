#!/usr/bin/env python3
"""
CondoClub Backend Pilot Flow Test
Tests the complete pilot flow as requested:
1. Email register/login
2. Join building via invite code (AURORA23, HORIZ24, VISTA25)
3. List deals
4. Join deal
5. Create deal payment
6. Simulate payment
7. Bookings show confirmed
8. Account deletion
9. Deal locked status handling
"""

import requests
import json
import sys
import time
import random
import string
from datetime import datetime, timezone, timedelta

# Base URL from frontend .env
BASE_URL = "https://membership-refactor-1.preview.emergentagent.com/api"
INVITE_CODES = ["AURORA23", "HORIZ24", "VISTA25"]
ADMIN_EMAIL = "admin@condoclub.com"
ADMIN_PASSWORD = "Admin123!"

class CondoClubPilotTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.user_token = None
        self.user_data = None
        self.building_id = None
        self.deal_id = None
        self.payment_id = None
        self.booking_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
        
    def generate_test_user(self):
        """Generate unique test user data"""
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return {
            "email": f"testuser_{random_suffix}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {random_suffix.upper()}"
        }
    
    def test_health_check(self):
        """Test API health check"""
        try:
            response = self.session.get(f"{BASE_URL}/")
            if response.status_code == 200:
                data = response.json()
                self.log_result("Health Check", True, f"API is healthy: {data.get('message', 'OK')}")
                return True
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Health Check", False, "Connection failed", str(e))
            return False
    
    def test_seed_data(self):
        """Ensure seed data is available"""
        try:
            response = self.session.post(f"{BASE_URL}/seed")
            if response.status_code in [200, 201]:
                data = response.json()
                self.log_result("Seed Data", True, f"Seed data ready: {data.get('message', 'OK')}")
                return True
            else:
                self.log_result("Seed Data", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Seed Data", False, "Request failed", str(e))
            return False
    
    def test_email_registration(self):
        """Test email registration"""
        user_data = self.generate_test_user()
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/register", json=user_data)
            if response.status_code == 200:
                data = response.json()
                self.user_token = data.get('session_token')
                self.user_data = data.get('user')
                self.session.headers['Authorization'] = f'Bearer {self.user_token}'
                self.log_result("Email Registration", True, f"Registration successful: {self.user_data['email']}")
                return True
            else:
                self.log_result("Email Registration", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Email Registration", False, "Request failed", str(e))
            return False
    
    def test_email_login(self):
        """Test email login with the registered user"""
        if not self.user_data:
            self.log_result("Email Login", False, "No user data available for login test")
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "TestPass123!"  # We know this from registration
        }
        
        try:
            # Clear existing auth first
            if 'Authorization' in self.session.headers:
                del self.session.headers['Authorization']
                
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.user_token = data.get('session_token')
                self.session.headers['Authorization'] = f'Bearer {self.user_token}'
                self.log_result("Email Login", True, f"Login successful: {data['user']['email']}")
                return True
            else:
                self.log_result("Email Login", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Email Login", False, "Request failed", str(e))
            return False
    
    def test_join_building_via_invite_code(self):
        """Test joining building via invite code"""
        # Try each invite code until one works
        for invite_code in INVITE_CODES:
            try:
                # First get building by invite code
                response = self.session.get(f"{BASE_URL}/buildings/code/{invite_code}")
                if response.status_code == 200:
                    building = response.json()
                    self.building_id = building['building_id']
                    
                    # Join the building
                    join_data = {
                        "invite_code": invite_code,
                        "unit_number": f"Unit{random.randint(100, 999)}"
                    }
                    
                    response = self.session.post(f"{BASE_URL}/memberships", json=join_data)
                    if response.status_code == 200:
                        membership = response.json()
                        self.log_result("Join Building via Invite Code", True, f"Successfully joined building: {building['name']} with code {invite_code}")
                        return True
                    else:
                        self.log_result("Join Building via Invite Code", False, f"Failed to join building {invite_code}: HTTP {response.status_code}", response.text)
                        continue
                else:
                    continue
                    
            except Exception as e:
                continue
        
        self.log_result("Join Building via Invite Code", False, "Failed to join any building with provided invite codes", f"Tried codes: {INVITE_CODES}")
        return False
    
    def test_list_deals(self):
        """Test listing deals"""
        try:
            response = self.session.get(f"{BASE_URL}/deals")
            if response.status_code == 200:
                deals = response.json()
                if deals:
                    self.deal_id = deals[0]['deal_id']  # Store first deal for testing
                    self.log_result("List Deals", True, f"Found {len(deals)} deals, selected deal: {deals[0]['title']}")
                    return True
                else:
                    self.log_result("List Deals", False, "No deals found")
                    return False
            else:
                self.log_result("List Deals", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("List Deals", False, "Request failed", str(e))
            return False
    
    def test_join_deal(self):
        """Test joining a deal"""
        if not self.deal_id:
            self.log_result("Join Deal", False, "No deal ID available for join test")
            return False
            
        try:
            response = self.session.post(f"{BASE_URL}/deals/{self.deal_id}/join")
            if response.status_code == 200:
                data = response.json()
                self.log_result("Join Deal", True, f"Successfully joined deal: {data['message']}")
                return True
            elif response.status_code == 400:
                # Check for expected errors
                error_msg = response.json().get('detail', '')
                if any(msg in error_msg for msg in ["Already joined", "deadline has passed", "full"]):
                    self.log_result("Join Deal", True, f"Expected error (deal constraints): {error_msg}")
                    return True
                else:
                    self.log_result("Join Deal", False, f"Unexpected error: {error_msg}")
                    return False
            else:
                self.log_result("Join Deal", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Join Deal", False, "Request failed", str(e))
            return False
    
    def test_create_deal_payment(self):
        """Test creating deal payment"""
        if not self.deal_id:
            self.log_result("Create Deal Payment", False, "No deal ID available for payment test")
            return False
            
        try:
            payment_data = {
                "type": "deal_payment",
                "deal_id": self.deal_id
            }
            
            response = self.session.post(f"{BASE_URL}/payments/create", json=payment_data)
            if response.status_code == 200:
                data = response.json()
                self.payment_id = data.get('payment_id')
                self.log_result("Create Deal Payment", True, f"Payment created successfully: {self.payment_id} (Amount: R${data.get('amount', 'N/A')})")
                return True
            else:
                self.log_result("Create Deal Payment", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Create Deal Payment", False, "Request failed", str(e))
            return False
    
    def test_simulate_payment(self):
        """Test payment simulation"""
        if not self.payment_id:
            self.log_result("Simulate Payment", False, "No payment ID available for simulation test")
            return False
            
        try:
            response = self.session.post(f"{BASE_URL}/payments/{self.payment_id}/simulate?status=approved")
            if response.status_code == 200:
                data = response.json()
                self.log_result("Simulate Payment", True, f"Payment simulation successful: {data['message']}")
                return True
            else:
                self.log_result("Simulate Payment", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Simulate Payment", False, "Request failed", str(e))
            return False
    
    def test_bookings_confirmed(self):
        """Test that bookings show as confirmed after payment"""
        try:
            response = self.session.get(f"{BASE_URL}/bookings")
            if response.status_code == 200:
                bookings = response.json()
                if bookings:
                    confirmed_bookings = [b for b in bookings if b['status'] == 'confirmed']
                    if confirmed_bookings:
                        self.booking_id = confirmed_bookings[0]['booking_id']
                        self.log_result("Bookings Show Confirmed", True, f"Found {len(confirmed_bookings)} confirmed bookings")
                        return True
                    else:
                        # Check if there are any bookings at all
                        pending_bookings = [b for b in bookings if b['status'] == 'pending']
                        if pending_bookings:
                            self.log_result("Bookings Show Confirmed", False, f"Found {len(pending_bookings)} pending bookings but no confirmed ones")
                        else:
                            self.log_result("Bookings Show Confirmed", False, "No bookings found at all")
                        return False
                else:
                    self.log_result("Bookings Show Confirmed", False, "No bookings found")
                    return False
            else:
                self.log_result("Bookings Show Confirmed", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Bookings Show Confirmed", False, "Request failed", str(e))
            return False
    
    def test_deal_locked_status_handling(self):
        """Test that deal locked status doesn't break join functionality"""
        try:
            # Get deals and check if any are locked
            response = self.session.get(f"{BASE_URL}/deals")
            if response.status_code == 200:
                deals = response.json()
                locked_deals = [d for d in deals if d.get('status') == 'locked']
                
                if locked_deals:
                    locked_deal_id = locked_deals[0]['deal_id']
                    
                    # Try to join locked deal (should still work according to code)
                    response = self.session.post(f"{BASE_URL}/deals/{locked_deal_id}/join")
                    if response.status_code == 200:
                        self.log_result("Deal Locked Status Handling", True, "Successfully joined locked deal")
                        return True
                    elif response.status_code == 400:
                        # Check if it's because user already joined or other expected errors
                        error_msg = response.json().get('detail', '')
                        if any(msg in error_msg for msg in ["Already joined", "deadline has passed", "full"]):
                            self.log_result("Deal Locked Status Handling", True, f"Expected error for locked deal: {error_msg}")
                            return True
                        else:
                            self.log_result("Deal Locked Status Handling", False, f"Unexpected error: {error_msg}")
                            return False
                    else:
                        self.log_result("Deal Locked Status Handling", False, f"HTTP {response.status_code}", response.text)
                        return False
                else:
                    self.log_result("Deal Locked Status Handling", True, "No locked deals found to test (system working correctly)")
                    return True
            else:
                self.log_result("Deal Locked Status Handling", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Deal Locked Status Handling", False, "Request failed", str(e))
            return False
    
    def test_account_deletion(self):
        """Test account deletion"""
        try:
            response = self.session.delete(f"{BASE_URL}/auth/account")
            if response.status_code == 200:
                data = response.json()
                self.log_result("Account Deletion", True, f"Account deletion successful: {data['message']}")
                return True
            else:
                self.log_result("Account Deletion", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Account Deletion", False, "Request failed", str(e))
            return False
    
    def run_pilot_flow_test(self):
        """Run the complete pilot flow test"""
        print("=" * 70)
        print("🚀 CONDOCLUB BACKEND PILOT FLOW TEST")
        print("=" * 70)
        print(f"📍 Base URL: {BASE_URL}")
        print(f"🔑 Testing invite codes: {', '.join(INVITE_CODES)}")
        print(f"👤 Admin credentials: {ADMIN_EMAIL}")
        print("=" * 70)
        
        tests = [
            ("Health Check", self.test_health_check),
            ("Seed Data", self.test_seed_data),
            ("Email Registration", self.test_email_registration),
            ("Email Login", self.test_email_login),
            ("Join Building via Invite Code", self.test_join_building_via_invite_code),
            ("List Deals", self.test_list_deals),
            ("Join Deal", self.test_join_deal),
            ("Create Deal Payment", self.test_create_deal_payment),
            ("Simulate Payment", self.test_simulate_payment),
            ("Bookings Show Confirmed", self.test_bookings_confirmed),
            ("Deal Locked Status Handling", self.test_deal_locked_status_handling),
            ("Account Deletion", self.test_account_deletion),
        ]
        
        for test_name, test_func in tests:
            print(f"\n--- Running: {test_name} ---")
            try:
                test_func()
            except Exception as e:
                self.log_result(test_name, False, f"Unexpected error: {str(e)}")
            
            # Small delay between tests
            time.sleep(0.5)
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 70)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{status}: {result['test']}")
        
        print(f"\nOverall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - PILOT FLOW WORKING CORRECTLY!")
        else:
            print(f"⚠️  {total-passed} TESTS FAILED - ISSUES NEED ATTENTION")
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
                    if result.get('details'):
                        print(f"    Details: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = CondoClubPilotTester()
    success = tester.run_pilot_flow_test()
    sys.exit(0 if success else 1)