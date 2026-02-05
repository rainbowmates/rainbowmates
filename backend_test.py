import requests
import sys
import json
import time
from datetime import datetime
import io
import base64

class RainbowMatesAPITester:
    def __init__(self, base_url="https://rainbow-buddies.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.user_data = None
        self.bestie_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            self.passed_tests.append(name)
            print(f"✅ {name} - PASSED")
        else:
            self.failed_tests.append({"test": name, "details": details})
            print(f"❌ {name} - FAILED: {details}")

    def test_user_registration(self):
        """Test user registration flow"""
        test_user = {
            "first_name": "Test",
            "surname": "User",
            "dob": "1990-01-01",
            "mobile": "+1234567890",
            "email": f"test_{int(time.time())}@example.com",
            "password": "TestPass123!"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/register", json=test_user, timeout=30)
            if response.status_code == 200:
                self.user_data = {**test_user, "id": response.json().get("user_id")}
                self.log_test("User Registration", True)
                return True
            else:
                self.log_test("User Registration", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Registration", False, str(e))
            return False

    def test_otp_verification(self):
        """Test OTP verification with mock OTP 123456"""
        if not self.user_data:
            self.log_test("OTP Verification", False, "No user data available")
            return False
            
        try:
            otp_data = {
                "identifier": self.user_data["email"],
                "otp": "123456"
            }
            response = requests.post(f"{self.api_url}/auth/verify-otp", json=otp_data, timeout=30)
            if response.status_code == 200:
                self.user_data.update(response.json().get("user", {}))
                self.log_test("OTP Verification", True)
                return True
            else:
                self.log_test("OTP Verification", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("OTP Verification", False, str(e))
            return False

    def test_user_login(self):
        """Test user login"""
        if not self.user_data:
            self.log_test("User Login", False, "No user data available")
            return False
            
        try:
            login_data = {
                "identifier": self.user_data["email"],
                "password": self.user_data["password"]
            }
            response = requests.post(f"{self.api_url}/auth/login", json=login_data, timeout=30)
            if response.status_code == 200:
                self.log_test("User Login", True)
                return True
            else:
                self.log_test("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Login", False, str(e))
            return False

    def test_create_avatar(self):
        """Test avatar creation with AI generation"""
        if not self.user_data:
            self.log_test("Create Avatar", False, "No user data available")
            return False
            
        try:
            # Create a simple test image (1x1 pixel PNG)
            test_image_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==')
            
            files = {
                'image': ('test.png', io.BytesIO(test_image_data), 'image/png')
            }
            data = {
                'user_id': self.user_data["id"],
                'relationship_status': 'Single',
                'relationship_with': 'Men',
                'relationship_feel': 'Fun'
            }
            
            response = requests.post(f"{self.api_url}/avatar/create", files=files, data=data, timeout=60)
            if response.status_code == 200:
                avatar_url = response.json().get("avatar_url")
                if avatar_url:
                    self.user_data["avatar_url"] = avatar_url
                    self.log_test("Create Avatar", True)
                    return True
                else:
                    self.log_test("Create Avatar", False, "No avatar URL returned")
                    return False
            else:
                self.log_test("Create Avatar", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Avatar", False, str(e))
            return False

    def test_create_bestie(self):
        """Test bestie creation"""
        if not self.user_data:
            self.log_test("Create Bestie", False, "No user data available")
            return False
            
        try:
            bestie_data = {
                "name": "Fabulous Friend",
                "image_url": "https://images.unsplash.com/photo-1625502664816-4938b1d0d685?w=400",
                "personality": ["Funny", "Chatty"],
                "interests": ["Fashion", "Food"],
                "accent": "American"
            }
            
            response = requests.post(f"{self.api_url}/bestie/create?user_id={self.user_data['id']}", json=bestie_data, timeout=60)
            if response.status_code == 200:
                self.bestie_data = response.json()
                self.log_test("Create Bestie", True)
                return True
            else:
                self.log_test("Create Bestie", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Bestie", False, str(e))
            return False

    def test_get_bestie(self):
        """Test getting user's bestie"""
        if not self.user_data:
            self.log_test("Get Bestie", False, "No user data available")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/bestie/{self.user_data['id']}", timeout=30)
            if response.status_code == 200:
                bestie = response.json()
                if bestie.get("name"):
                    self.log_test("Get Bestie", True)
                    return True
                else:
                    self.log_test("Get Bestie", False, "Invalid bestie data returned")
                    return False
            else:
                self.log_test("Get Bestie", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get Bestie", False, str(e))
            return False

    def test_chat_with_bestie(self):
        """Test text chat with bestie using Claude Sonnet"""
        if not self.user_data or not self.bestie_data:
            self.log_test("Chat with Bestie", False, "No user or bestie data available")
            return False
            
        try:
            message_data = {
                "bestie_id": self.bestie_data["id"],
                "content": "Hello! How are you today?"
            }
            
            response = requests.post(f"{self.api_url}/chat/message?user_id={self.user_data['id']}", json=message_data, timeout=60)
            if response.status_code == 200:
                reply = response.json().get("message")
                if reply and len(reply) > 0:
                    self.log_test("Chat with Bestie", True)
                    return True
                else:
                    self.log_test("Chat with Bestie", False, "No reply message received")
                    return False
            else:
                self.log_test("Chat with Bestie", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Chat with Bestie", False, str(e))
            return False

    def test_get_chat_history(self):
        """Test getting chat history"""
        if not self.user_data or not self.bestie_data:
            self.log_test("Get Chat History", False, "No user or bestie data available")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/chat/history/{self.user_data['id']}/{self.bestie_data['id']}", timeout=30)
            if response.status_code == 200:
                history = response.json()
                if isinstance(history, list):
                    self.log_test("Get Chat History", True)
                    return True
                else:
                    self.log_test("Get Chat History", False, "Invalid history format")
                    return False
            else:
                self.log_test("Get Chat History", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get Chat History", False, str(e))
            return False

    def test_shopping_recommendations(self):
        """Test shopping assistant with AI recommendations"""
        if not self.user_data or not self.bestie_data:
            self.log_test("Shopping Recommendations", False, "No user or bestie data available")
            return False
            
        try:
            shopping_data = {
                "bestie_id": self.bestie_data["id"],
                "gender": "Female",
                "style": "Casual",
                "max_price": 100.0
            }
            
            response = requests.post(f"{self.api_url}/shopping/recommendations?user_id={self.user_data['id']}", json=shopping_data, timeout=60)
            if response.status_code == 200:
                recommendations = response.json().get("recommendations")
                if recommendations and len(recommendations) > 0:
                    self.log_test("Shopping Recommendations", True)
                    return True
                else:
                    self.log_test("Shopping Recommendations", False, "No recommendations received")
                    return False
            else:
                self.log_test("Shopping Recommendations", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Shopping Recommendations", False, str(e))
            return False

    def test_subscription_creation(self):
        """Test subscription creation and Stripe checkout"""
        if not self.user_data:
            self.log_test("Subscription Creation", False, "No user data available")
            return False
            
        try:
            subscription_data = {
                "plan": "1_month",
                "auto_renew": False
            }
            
            response = requests.post(f"{self.api_url}/subscription/create?user_id={self.user_data['id']}", json=subscription_data, timeout=30)
            if response.status_code == 200:
                checkout_data = response.json()
                if checkout_data.get("checkout_url") and checkout_data.get("session_id"):
                    self.log_test("Subscription Creation", True)
                    return True
                else:
                    self.log_test("Subscription Creation", False, "Missing checkout URL or session ID")
                    return False
            else:
                self.log_test("Subscription Creation", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Subscription Creation", False, str(e))
            return False

    def test_user_subscription_status(self):
        """Test getting user subscription status"""
        if not self.user_data:
            self.log_test("User Subscription Status", False, "No user data available")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/subscription/{self.user_data['id']}", timeout=30)
            if response.status_code == 200:
                subscription = response.json()
                if "has_subscription" in subscription:
                    self.log_test("User Subscription Status", True)
                    return True
                else:
                    self.log_test("User Subscription Status", False, "Invalid subscription data format")
                    return False
            else:
                self.log_test("User Subscription Status", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Subscription Status", False, str(e))
            return False

    def test_delete_chat_history(self):
        """Test deleting chat history"""
        if not self.user_data or not self.bestie_data:
            self.log_test("Delete Chat History", False, "No user or bestie data available")
            return False
            
        try:
            response = requests.delete(f"{self.api_url}/chat/history/{self.user_data['id']}/{self.bestie_data['id']}?timeframe=all", timeout=30)
            if response.status_code == 200:
                result = response.json()
                if "deleted_count" in result:
                    self.log_test("Delete Chat History", True)
                    return True
                else:
                    self.log_test("Delete Chat History", False, "Invalid delete response format")
                    return False
            else:
                self.log_test("Delete Chat History", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Delete Chat History", False, str(e))
            return False

    def test_user_update(self):
        """Test updating user details"""
        if not self.user_data:
            self.log_test("User Update", False, "No user data available")
            return False
            
        try:
            update_data = {
                "first_name": "Updated Test"
            }
            
            response = requests.put(f"{self.api_url}/user/update/{self.user_data['id']}", json=update_data, timeout=30)
            if response.status_code == 200:
                self.log_test("User Update", True)
                return True
            else:
                self.log_test("User Update", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Update", False, str(e))
            return False

    def test_user_deletion(self):
        """Test deleting user account (run last)"""
        if not self.user_data:
            self.log_test("User Deletion", False, "No user data available")
            return False
            
        try:
            response = requests.delete(f"{self.api_url}/user/delete/{self.user_data['id']}", timeout=30)
            if response.status_code == 200:
                self.log_test("User Deletion", True)
                return True
            else:
                self.log_test("User Deletion", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Deletion", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("🚀 Starting Rainbow Mates Backend API Tests")
        print(f"📍 Testing API: {self.api_url}")
        print("=" * 60)
        
        # Core authentication flow
        if self.test_user_registration():
            if self.test_otp_verification():
                self.test_user_login()
        
        # Avatar and bestie creation
        self.test_create_avatar()
        if self.test_create_bestie():
            self.test_get_bestie()
        
        # Chat functionality
        if self.test_chat_with_bestie():
            self.test_get_chat_history()
            self.test_delete_chat_history()
        
        # Shopping and subscription features
        self.test_shopping_recommendations()
        self.test_subscription_creation()
        self.test_user_subscription_status()
        
        # Settings functionality
        self.test_user_update()
        
        # Cleanup (run last)
        self.test_user_deletion()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        
        if self.passed_tests:
            print(f"\n✅ Passed Tests: {', '.join(self.passed_tests)}")
        
        return self.tests_passed, self.tests_run, self.failed_tests, self.passed_tests

def main():
    tester = RainbowMatesAPITester()
    passed, total, failed, passed_list = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())