import requests
import sys
import json
import time
import base64
import io

class AvatarOutfitTester:
    def __init__(self, base_url="https://rainbow-buddies.preview.emergentagent.com"):
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

    def test_user_registration_and_login(self):
        """Test user registration and login flow"""
        # Create unique user
        timestamp = int(time.time())
        test_user = {
            "first_name": "Avatar",
            "surname": "Tester",
            "dob": "1995-01-01",
            "mobile": f"+123456{timestamp % 10000}",
            "email": f"avatar_test_{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        try:
            # Register user
            response = requests.post(f"{self.api_url}/auth/register", json=test_user, timeout=30)
            if response.status_code != 200:
                self.log_test("User Registration", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            user_id = response.json().get("user_id")
            self.user_data = {**test_user, "id": user_id}
            
            # Verify OTP
            otp_data = {
                "identifier": test_user["email"],
                "otp": "123456"
            }
            response = requests.post(f"{self.api_url}/auth/verify-otp", json=otp_data, timeout=30)
            if response.status_code != 200:
                self.log_test("OTP Verification", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            # Login
            login_data = {
                "identifier": test_user["email"],
                "password": test_user["password"]
            }
            response = requests.post(f"{self.api_url}/auth/login", json=login_data, timeout=30)
            if response.status_code == 200:
                self.log_test("User Registration & Login Flow", True)
                return True
            else:
                self.log_test("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Registration & Login Flow", False, str(e))
            return False

    def test_avatar_generation_with_outfit(self):
        """Test the new avatar generation with outfit API endpoint"""
        if not self.user_data:
            self.log_test("Avatar Generation with Outfit", False, "No user data available")
            return False
            
        try:
            # Create a test base64 image (simple 1x1 pixel PNG)
            test_image_b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
            base_image = f"data:image/png;base64,{test_image_b64}"
            
            # Test outfit generation request
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
            
            response = requests.post(f"{self.api_url}/avatar/generate-with-outfit", json=outfit_request, timeout=90)
            
            if response.status_code == 200:
                result = response.json()
                avatar_url = result.get("avatar_url")
                if avatar_url and avatar_url.startswith("data:image"):
                    self.log_test("Avatar Generation with Outfit", True)
                    return True
                else:
                    self.log_test("Avatar Generation with Outfit", False, "No valid avatar URL returned")
                    return False
            else:
                self.log_test("Avatar Generation with Outfit", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Avatar Generation with Outfit", False, str(e))
            return False

    def test_multiple_outfit_options(self):
        """Test different outfit options"""
        if not self.user_data:
            self.log_test("Multiple Outfit Options", False, "No user data available")
            return False
            
        outfit_options = [
            "Floral sundress",
            "Sweater & jeans", 
            "Cocktail dress",
            "Blazer & pants"
        ]
        
        test_image_b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        base_image = f"data:image/png;base64,{test_image_b64}"
        
        successful_generations = 0
        
        for outfit in outfit_options:
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
                
                response = requests.post(f"{self.api_url}/avatar/generate-with-outfit", json=outfit_request, timeout=90)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("avatar_url"):
                        successful_generations += 1
                        print(f"  ✓ Generated avatar with: {outfit}")
                    else:
                        print(f"  ✗ Failed to generate avatar with: {outfit} (no URL)")
                else:
                    print(f"  ✗ Failed to generate avatar with: {outfit} (status: {response.status_code})")
                    
            except Exception as e:
                print(f"  ✗ Error generating avatar with {outfit}: {str(e)}")
        
        if successful_generations >= 3:  # At least 3 out of 4 should work
            self.log_test("Multiple Outfit Options", True, f"{successful_generations}/4 outfits generated successfully")
            return True
        else:
            self.log_test("Multiple Outfit Options", False, f"Only {successful_generations}/4 outfits generated successfully")
            return False

    def test_filter_variations(self):
        """Test different filter styles"""
        if not self.user_data:
            self.log_test("Filter Variations", False, "No user data available")
            return False
            
        filter_presets = [
            {"name": "Natural", "style": {"brightness": 105, "contrast": 100, "saturate": 100, "warmth": 0}},
            {"name": "Warm Glow", "style": {"brightness": 110, "contrast": 105, "saturate": 110, "warmth": 10}},
            {"name": "Cool Vibes", "style": {"brightness": 105, "contrast": 110, "saturate": 115, "warmth": -10}},
            {"name": "Soft & Dreamy", "style": {"brightness": 115, "contrast": 95, "saturate": 95, "warmth": 5}}
        ]
        
        test_image_b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        base_image = f"data:image/png;base64,{test_image_b64}"
        
        successful_filters = 0
        
        for filter_preset in filter_presets:
            try:
                outfit_request = {
                    "user_id": self.user_data["id"],
                    "base_image": base_image,
                    "outfit_description": "Blue jeans & graphic tee",
                    "filter_style": filter_preset["style"]
                }
                
                response = requests.post(f"{self.api_url}/avatar/generate-with-outfit", json=outfit_request, timeout=90)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("avatar_url"):
                        successful_filters += 1
                        print(f"  ✓ Generated avatar with {filter_preset['name']} filter")
                    else:
                        print(f"  ✗ Failed to generate avatar with {filter_preset['name']} filter (no URL)")
                else:
                    print(f"  ✗ Failed to generate avatar with {filter_preset['name']} filter (status: {response.status_code})")
                    
            except Exception as e:
                print(f"  ✗ Error generating avatar with {filter_preset['name']} filter: {str(e)}")
        
        if successful_filters == 4:
            self.log_test("Filter Variations", True, "All 4 filter presets working")
            return True
        else:
            self.log_test("Filter Variations", False, f"Only {successful_filters}/4 filter presets working")
            return False

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        if not self.user_data:
            self.log_test("Error Handling", False, "No user data available")
            return False
            
        try:
            # Test with invalid base64 image
            invalid_request = {
                "user_id": self.user_data["id"],
                "base_image": "invalid_base64_data",
                "outfit_description": "Test outfit",
                "filter_style": {"brightness": 100, "contrast": 100, "saturate": 100, "warmth": 0}
            }
            
            response = requests.post(f"{self.api_url}/avatar/generate-with-outfit", json=invalid_request, timeout=30)
            
            # Should return an error (not 200)
            if response.status_code != 200:
                self.log_test("Error Handling", True, "Properly handles invalid image data")
                return True
            else:
                self.log_test("Error Handling", False, "Should have returned error for invalid image data")
                return False
                
        except Exception as e:
            self.log_test("Error Handling", False, str(e))
            return False

    def cleanup_user(self):
        """Clean up test user"""
        if self.user_data:
            try:
                response = requests.delete(f"{self.api_url}/user/delete/{self.user_data['id']}", timeout=30)
                if response.status_code == 200:
                    print("✅ Test user cleaned up successfully")
                else:
                    print(f"⚠️ Failed to clean up test user: {response.status_code}")
            except Exception as e:
                print(f"⚠️ Error cleaning up test user: {str(e)}")

    def run_avatar_outfit_tests(self):
        """Run all avatar outfit generation tests"""
        print("🎨 Starting Avatar Outfit Generation Tests")
        print(f"📍 Testing API: {self.api_url}")
        print("=" * 60)
        
        # Setup user
        if not self.test_user_registration_and_login():
            print("❌ Cannot proceed without user registration")
            return self.tests_passed, self.tests_run, self.failed_tests, self.passed_tests
        
        # Test core outfit generation functionality
        self.test_avatar_generation_with_outfit()
        self.test_multiple_outfit_options()
        self.test_filter_variations()
        self.test_error_handling()
        
        # Cleanup
        self.cleanup_user()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Avatar Outfit Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        
        if self.passed_tests:
            print(f"\n✅ Passed Tests: {', '.join(self.passed_tests)}")
        
        return self.tests_passed, self.tests_run, self.failed_tests, self.passed_tests

def main():
    tester = AvatarOutfitTester()
    passed, total, failed, passed_list = tester.run_avatar_outfit_tests()
    
    # Return appropriate exit code
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())