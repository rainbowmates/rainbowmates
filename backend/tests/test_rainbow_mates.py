"""
Rainbow Mates Backend API Tests
Tests for: Registration, OTP verification, Login, Avatar, Bestie creation
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data with unique identifiers
TEST_USER_EMAIL = f"test_{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_MOBILE = f"+447{uuid.uuid4().hex[:9]}"
TEST_USER_PASSWORD = "testpass123"
TEST_USER_ID = None


class TestHealthAndBasics:
    """Basic API health checks"""
    
    def test_api_reachable(self):
        """Test that API is reachable"""
        response = requests.get(f"{BASE_URL}/api/outfits/catalog")
        assert response.status_code == 200
        data = response.json()
        assert "casual-jeans" in data


class TestUserRegistration:
    """User registration flow tests"""
    
    def test_register_new_user(self):
        """Test user registration with valid data"""
        global TEST_USER_ID
        
        payload = {
            "first_name": "Test",
            "surname": "User",
            "dob": "1990-01-15",
            "mobile": TEST_USER_MOBILE,
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "message" in data
        TEST_USER_ID = data["user_id"]
        print(f"Registered user with ID: {TEST_USER_ID}")
    
    def test_register_duplicate_user(self):
        """Test that duplicate registration fails"""
        payload = {
            "first_name": "Test",
            "surname": "User",
            "dob": "1990-01-15",
            "mobile": TEST_USER_MOBILE,
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
    
    def test_register_invalid_email(self):
        """Test registration with invalid email"""
        payload = {
            "first_name": "Test",
            "surname": "User",
            "dob": "1990-01-15",
            "mobile": f"+447{uuid.uuid4().hex[:9]}",
            "email": "invalid-email",
            "password": TEST_USER_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 422  # Validation error
    
    def test_register_underage_user(self):
        """Test registration with underage DOB"""
        today = datetime.now()
        underage_dob = (today - timedelta(days=365*16)).strftime("%Y-%m-%d")
        
        payload = {
            "first_name": "Young",
            "surname": "User",
            "dob": underage_dob,
            "mobile": f"+447{uuid.uuid4().hex[:9]}",
            "email": f"young_{uuid.uuid4().hex[:8]}@example.com",
            "password": TEST_USER_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 422  # Validation error for age


class TestOTPVerification:
    """OTP verification tests"""
    
    def test_verify_otp_valid(self):
        """Test OTP verification with valid code 123456"""
        payload = {
            "identifier": TEST_USER_EMAIL,
            "otp": "123456"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json=payload)
        assert response.status_code == 200, f"OTP verification failed: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == TEST_USER_EMAIL.lower()
        assert data["user"]["is_verified"] == True
    
    def test_verify_otp_invalid(self):
        """Test OTP verification with invalid code"""
        payload = {
            "identifier": TEST_USER_EMAIL,
            "otp": "000000"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json=payload)
        assert response.status_code == 400
        assert "invalid" in response.json().get("detail", "").lower()


class TestUserLogin:
    """User login tests"""
    
    def test_login_valid_credentials(self):
        """Test login with valid credentials"""
        payload = {
            "identifier": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == TEST_USER_EMAIL.lower()
    
    def test_login_invalid_password(self):
        """Test login with wrong password"""
        payload = {
            "identifier": TEST_USER_EMAIL,
            "password": "wrongpassword"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 401
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent user"""
        payload = {
            "identifier": "nonexistent@example.com",
            "password": "anypassword"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 401


class TestUserProfile:
    """User profile and avatar tests"""
    
    def test_get_user_by_id(self):
        """Test getting user by ID"""
        global TEST_USER_ID
        if not TEST_USER_ID:
            pytest.skip("No test user ID available")
        
        response = requests.get(f"{BASE_URL}/api/user/{TEST_USER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == TEST_USER_EMAIL.lower()
    
    def test_get_user_not_found(self):
        """Test getting non-existent user"""
        response = requests.get(f"{BASE_URL}/api/user/nonexistent-id-12345")
        assert response.status_code == 404
    
    def test_update_user_avatar(self):
        """Test updating user with avatar URL"""
        global TEST_USER_ID
        if not TEST_USER_ID:
            pytest.skip("No test user ID available")
        
        avatar_url = "https://customer-assets.emergentagent.com/job_virtual-bff/artifacts/zprvnqkw_fruitee.fun_A_semi-realistic_AI_fashion_model_full-body_stand_1a494135-0720-4c9b-bd13-a0df59baab7d_1.png"
        
        payload = {
            "avatar_url": avatar_url,
            "relationship_status": "Single",
            "relationship_with": "Men",
            "relationship_feel": "Happy"
        }
        
        response = requests.put(f"{BASE_URL}/api/user/update/{TEST_USER_ID}", json=payload)
        assert response.status_code == 200
        
        # Verify the update persisted
        get_response = requests.get(f"{BASE_URL}/api/user/{TEST_USER_ID}")
        assert get_response.status_code == 200
        user_data = get_response.json()
        assert user_data["avatar_url"] == avatar_url
        assert user_data["relationship_status"] == "Single"


class TestBestieCreation:
    """Bestie creation and retrieval tests"""
    
    def test_create_bestie(self):
        """Test creating a bestie - should be fast (no AI image generation)"""
        global TEST_USER_ID
        if not TEST_USER_ID:
            pytest.skip("No test user ID available")
        
        import time
        start_time = time.time()
        
        payload = {
            "name": "TestBestie",
            "image_url": "https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/32yvckp4_gay%2017.png",
            "personality": ["Funny", "Chatty"],
            "interests": ["Fashion", "Food"],
            "accent": "American"
        }
        
        response = requests.post(f"{BASE_URL}/api/bestie/create?user_id={TEST_USER_ID}", json=payload)
        
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200, f"Bestie creation failed: {response.text}"
        
        data = response.json()
        assert data["name"] == "TestBestie"
        assert data["user_id"] == TEST_USER_ID
        assert data["image_url"] == payload["image_url"]
        assert "id" in data
        
        # Verify bestie creation is fast (under 3 seconds as per requirement)
        assert elapsed_time < 3, f"Bestie creation took {elapsed_time:.2f}s, should be under 3s"
        print(f"Bestie created in {elapsed_time:.2f} seconds")
    
    def test_get_bestie(self):
        """Test getting user's bestie"""
        global TEST_USER_ID
        if not TEST_USER_ID:
            pytest.skip("No test user ID available")
        
        response = requests.get(f"{BASE_URL}/api/bestie/{TEST_USER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TestBestie"
        assert data["user_id"] == TEST_USER_ID
    
    def test_get_bestie_not_found(self):
        """Test getting bestie for user without one"""
        response = requests.get(f"{BASE_URL}/api/bestie/nonexistent-user-id")
        assert response.status_code == 404


class TestSubscription:
    """Subscription API tests"""
    
    def test_get_subscription_no_subscription(self):
        """Test getting subscription for user without one"""
        global TEST_USER_ID
        if not TEST_USER_ID:
            pytest.skip("No test user ID available")
        
        response = requests.get(f"{BASE_URL}/api/subscription/{TEST_USER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_subscription"] == False


class TestCleanup:
    """Cleanup test data"""
    
    def test_delete_test_user(self):
        """Delete test user and associated data"""
        global TEST_USER_ID
        if not TEST_USER_ID:
            pytest.skip("No test user ID to delete")
        
        response = requests.delete(f"{BASE_URL}/api/user/delete/{TEST_USER_ID}")
        assert response.status_code == 200
        
        # Verify user is deleted
        get_response = requests.get(f"{BASE_URL}/api/user/{TEST_USER_ID}")
        assert get_response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
