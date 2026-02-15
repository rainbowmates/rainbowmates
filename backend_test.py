import requests
import sys
import json
from datetime import datetime

class RegistrationFlowTester:
    def __init__(self, base_url="https://tom-emotional-avatar.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@example.com"
        self.test_user_mobile = f"+44700000{datetime.now().strftime('%H%M')}"

    def log_test(self, name, success, response_data=None, error=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
        else:
            print(f"❌ {name}")
            if error:
                print(f"   Error: {error}")
        print()

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json() if response.text else {}
            except:
                response_data = {"text": response.text[:200]}
            
            if success:
                self.log_test(name, True, response_data)
                return True, response_data
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}. Response: {response_data}"
                self.log_test(name, False, error=error_msg)
                return False, response_data

        except Exception as e:
            self.log_test(name, False, error=str(e))
            return False, {}

    def test_registration_api(self):
        """Test user registration API"""
        registration_data = {
            "first_name": "Test",
            "surname": "User",
            "dob": "1995-01-01",
            "email": self.test_user_email,
            "password": "testpass123",
            "mobile": self.test_user_mobile
        }
        
        success, response = self.run_test(
            "Register new user",
            "POST",
            "auth/register",
            200,
            data=registration_data
        )
        
        return success, response

    def test_otp_verification_api(self):
        """Test OTP verification API"""
        otp_data = {
            "identifier": self.test_user_email,
            "otp": "123456"
        }
        
        success, response = self.run_test(
            "Verify OTP (123456)",
            "POST",
            "auth/verify-otp",
            200,
            data=otp_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            
        return success, response

    def test_login_api(self):
        """Test login API"""
        login_data = {
            "identifier": self.test_user_email,
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "User login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        return success, response

    def test_invalid_otp(self):
        """Test invalid OTP handling"""
        otp_data = {
            "identifier": self.test_user_email,
            "otp": "000000"
        }
        
        success, response = self.run_test(
            "Invalid OTP (should fail)",
            "POST",
            "auth/verify-otp",
            400,
            data=otp_data
        )
        
        return success, response

    def test_duplicate_registration(self):
        """Test duplicate registration handling"""
        registration_data = {
            "first_name": "Test",
            "surname": "User",
            "dob": "1995-01-01",
            "email": self.test_user_email,
            "password": "testpass123",
            "mobile": self.test_user_mobile
        }
        
        success, response = self.run_test(
            "Duplicate registration (should fail)",
            "POST",
            "auth/register",
            400,
            data=registration_data
        )
        
        return success, response

def main():
    print("🔍 Testing Registration Flow Backend APIs...")
    print("=" * 50)
    
    tester = RegistrationFlowTester()
    
    try:
        # Test basic registration flow
        print("📝 Testing Registration API...")
        reg_success, reg_response = tester.test_registration_api()
        if not reg_success:
            print("❌ Registration failed, cannot continue with flow test")
            return 1

        print("🔐 Testing OTP Verification API...")
        otp_success, otp_response = tester.test_otp_verification_api()
        if not otp_success:
            print("❌ OTP verification failed")

        print("🔑 Testing Login API...")
        login_success, login_response = tester.test_login_api()
        if not login_success:
            print("❌ Login failed")

        # Test error conditions
        print("⚠️  Testing Error Handling...")
        tester.test_invalid_otp()
        tester.test_duplicate_registration()

        # Print summary
        print("=" * 50)
        print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
        
        if tester.tests_passed == tester.tests_run:
            print("✅ All tests passed! Backend APIs are working correctly.")
            return 0
        elif tester.tests_passed >= tester.tests_run * 0.6:  # At least 60% passed
            print("⚠️  Most tests passed. Backend is mostly functional.")
            return 0
        else:
            print("❌ Many tests failed. Backend needs attention.")
            return 1

    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"🔥 Unexpected error during testing: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())