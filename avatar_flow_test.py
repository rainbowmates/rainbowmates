import requests
import sys
import json
import time
import base64
import io
from datetime import datetime

class AvatarFlowTester:
    def __init__(self, base_url="https://rainbowpals.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.user_data = None
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
        """Test user registration with unique timestamp"""
        timestamp = int(time.time())
        test_user = {
            "first_name": "Avatar",
            "surname": "Tester",
            "dob": "1995-05-15",
            "mobile": f"+123456{timestamp % 10000}",
            "email": f"avatar_test_{timestamp}@example.com",
            "password": "AvatarTest123!"
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

    def test_avatar_generation_with_outfit(self):
        """Test avatar generation with outfit API"""
        if not self.user_data:
            self.log_test("Avatar Generation with Outfit", False, "No user data available")
            return False
            
        try:
            # Create a simple test image (base64 encoded 1x1 pixel PNG)
            test_image_b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
            base_image = f"data:image/png;base64,{test_image_b64}"
            
            outfit_request = {
                "user_id": self.user_data["id"],
                "base_image": base_image,
                "outfit_description": "Classic denim & white tee",
                "filter_style": {
                    "brightness": 110,
                    "contrast": 105,
                    "saturate": 110,
                    "warmth": 10
                }
            }
            
            response = requests.post(f"{self.api_url}/avatar/generate-with-outfit", json=outfit_request, timeout=60)
            if response.status_code == 200:
                result = response.json()
                if result.get("avatar_url"):
                    self.log_test("Avatar Generation with Outfit", True)
                    return True
                else:
                    self.log_test("Avatar Generation with Outfit", False, "No avatar URL returned")
                    return False
            else:
                self.log_test("Avatar Generation with Outfit", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Avatar Generation with Outfit", False, str(e))
            return False

    def test_multiple_outfit_options(self):
        """Test multiple outfit options"""
        if not self.user_data:
            self.log_test("Multiple Outfit Options", False, "No user data available")
            return False
            
        outfits = [
            "Floral sundress",
            "Sweater & jeans", 
            "Cocktail dress"
        ]
        
        test_image_b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        base_image = f"data:image/png;base64,{test_image_b64}"
        
        success_count = 0
        
        for outfit in outfits:
            try:
                outfit_request = {
                    "user_id": self.user_data["id"],
                    "base_image": base_image,
                    "outfit_description": outfit,
                    "filter_style": {
                        "brightness": 105,
                        "contrast": 100,
                        "saturate": 100,
                        "warmth": 0
                    }
                }
                
                response = requests.post(f"{self.api_url}/avatar/generate-with-outfit", json=outfit_request, timeout=60)
                if response.status_code == 200 and response.json().get("avatar_url"):
                    success_count += 1
                    print(f"  ✓ {outfit} - Generated successfully")
                else:
                    print(f"  ✗ {outfit} - Failed: {response.status_code}")
                    
            except Exception as e:
                print(f"  ✗ {outfit} - Error: {str(e)}")
        
        if success_count == len(outfits):
            self.log_test("Multiple Outfit Options", True)
            return True
        else:
            self.log_test("Multiple Outfit Options", False, f"Only {success_count}/{len(outfits)} outfits generated successfully")
            return False

    def test_filter_variations(self):
        """Test different filter variations"""
        if not self.user_data:
            self.log_test("Filter Variations", False, "No user data available")
            return False
            
        filters = [
            {"name": "Natural", "style": {"brightness": 105, "contrast": 100, "saturate": 100, "warmth": 0}},
            {"name": "Warm Glow", "style": {"brightness": 110, "contrast": 105, "saturate": 110, "warmth": 10}},
            {"name": "Cool Vibes", "style": {"brightness": 105, "contrast": 110, "saturate": 115, "warmth": -10}},
            {"name": "Soft & Dreamy", "style": {"brightness": 115, "contrast": 95, "saturate": 95, "warmth": 5}}
        ]
        
        test_image_b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        base_image = f"data:image/png;base64,{test_image_b64}"
        
        success_count = 0
        
        for filter_preset in filters:
            try:
                outfit_request = {
                    "user_id": self.user_data["id"],
                    "base_image": base_image,
                    "outfit_description": "Classic denim & white tee",
                    "filter_style": filter_preset["style"]
                }
                
                response = requests.post(f"{self.api_url}/avatar/generate-with-outfit", json=outfit_request, timeout=60)
                if response.status_code == 200 and response.json().get("avatar_url"):
                    success_count += 1
                    print(f"  ✓ {filter_preset['name']} - Applied successfully")
                else:
                    print(f"  ✗ {filter_preset['name']} - Failed: {response.status_code}")
                    
            except Exception as e:
                print(f"  ✗ {filter_preset['name']} - Error: {str(e)}")
        
        if success_count == len(filters):
            self.log_test("Filter Variations", True)
            return True
        else:
            self.log_test("Filter Variations", False, f"Only {success_count}/{len(filters)} filters applied successfully")
            return False

    def test_user_update_with_avatar(self):
        """Test updating user with avatar and relationship details"""
        if not self.user_data:
            self.log_test("User Update with Avatar", False, "No user data available")
            return False
            
        try:
            update_data = {
                "avatar_url": "data:image/png;base64,test_avatar_data",
                "relationship_status": "Single",
                "relationship_with": "Men", 
                "relationship_feel": "Fun"
            }
            
            response = requests.put(f"{self.api_url}/user/update/{self.user_data['id']}", json=update_data, timeout=30)
            if response.status_code == 200:
                self.log_test("User Update with Avatar", True)
                return True
            else:
                self.log_test("User Update with Avatar", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Update with Avatar", False, str(e))
            return False

    def run_avatar_flow_tests(self):
        """Run avatar creation flow tests"""
        print("🎨 Starting Avatar Creation Flow Tests")
        print(f"📍 Testing API: {self.api_url}")
        print("=" * 60)
        
        # Authentication flow
        if self.test_user_registration():
            if self.test_otp_verification():
                self.test_user_login()
        
        # Avatar creation tests
        self.test_avatar_generation_with_outfit()
        self.test_multiple_outfit_options()
        self.test_filter_variations()
        self.test_user_update_with_avatar()
        
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
    tester = AvatarFlowTester()
    passed, total, failed, passed_list = tester.run_avatar_flow_tests()
    
    # Return appropriate exit code
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())