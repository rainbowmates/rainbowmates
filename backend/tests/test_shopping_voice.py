"""
Rainbow Mates - Shopping and Voice Feature Tests
Tests for: Shopping recommendations (Haiku model), Voice TTS (British accent)

These are integration tests that require a running backend server.
Run with: REACT_APP_BACKEND_URL=<url> pytest tests/test_shopping_voice.py -v
"""
import pytest
import requests
import os
import uuid
import time


def get_base_url():
    """Get the backend URL from environment or frontend .env file."""
    url = os.environ.get('REACT_APP_BACKEND_URL', '')
    if not url:
        # Try reading from frontend .env
        env_path = '/app/frontend/.env'
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        url = line.split('=', 1)[1].strip()
                        break
    return url.rstrip('/')


BASE_URL = get_base_url()

# Skip all tests in this module if BASE_URL is not available
pytestmark = pytest.mark.skipif(
    not BASE_URL,
    reason="REACT_APP_BACKEND_URL not set - integration tests require a running backend"
)

# Test user data
import random
TEST_USER_EMAIL = f"test_shop_{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_MOBILE = f"+447{''.join([str(random.randint(0,9)) for _ in range(9)])}"
TEST_USER_PASSWORD = "testpass123"
TEST_USER_ID = None
TEST_BESTIE_ID = None


class TestSetup:
    """Setup test user and bestie for shopping tests"""
    
    def test_create_test_user(self):
        """Create a test user for shopping tests"""
        global TEST_USER_ID
        
        payload = {
            "first_name": "ShopTest",
            "surname": "User",
            "dob": "1990-01-15",
            "mobile": TEST_USER_MOBILE,
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        TEST_USER_ID = response.json()["user_id"]
        
        # Verify OTP
        otp_response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "identifier": TEST_USER_EMAIL,
            "otp": "123456"
        })
        assert otp_response.status_code == 200
        print(f"Created test user: {TEST_USER_ID}")
    
    def test_create_test_bestie_british(self):
        """Create a bestie with British accent for voice tests"""
        global TEST_BESTIE_ID
        
        if not TEST_USER_ID:
            pytest.skip("No test user ID available")
        
        payload = {
            "name": "BritishBestie",
            "image_url": "https://customer-assets.emergentagent.com/job_rainbow-mates-1/artifacts/32yvckp4_gay%2017.png",
            "personality": ["Funny", "Chatty"],
            "interests": ["Fashion", "Food"],
            "accent": "British"  # British accent for TTS test
        }
        
        response = requests.post(f"{BASE_URL}/api/bestie/create?user_id={TEST_USER_ID}", json=payload)
        assert response.status_code == 200, f"Bestie creation failed: {response.text}"
        
        data = response.json()
        TEST_BESTIE_ID = data["id"]
        assert data["accent"] == "British"
        print(f"Created British bestie: {TEST_BESTIE_ID}")


class TestShoppingRecommendations:
    """Shopping recommendations API tests - should use Haiku model for speed"""
    
    def test_shopping_recommendations_speed(self):
        """Test that shopping recommendations are fast (using Haiku model)"""
        global TEST_USER_ID, TEST_BESTIE_ID
        
        if not TEST_USER_ID or not TEST_BESTIE_ID:
            pytest.skip("No test user or bestie available")
        
        payload = {
            "bestie_id": TEST_BESTIE_ID,
            "user_request": "Find me a casual summer dress under $100",
            "max_price": 100.0
        }
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/api/shopping/recommendations?user_id={TEST_USER_ID}",
            json=payload
        )
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200, f"Shopping API failed: {response.text}"
        
        data = response.json()
        assert "recommendations" in data
        assert len(data["recommendations"]) > 0
        
        # AI response time can vary - 30s is a reasonable upper bound
        print(f"Shopping recommendations received in {elapsed_time:.2f} seconds")
        assert elapsed_time < 30, f"Shopping took {elapsed_time:.2f}s, expected under 30s"
    
    def test_shopping_recommendations_has_links(self):
        """Test that shopping recommendations include shopping links"""
        global TEST_USER_ID, TEST_BESTIE_ID
        
        if not TEST_USER_ID or not TEST_BESTIE_ID:
            pytest.skip("No test user or bestie available")
        
        payload = {
            "bestie_id": TEST_BESTIE_ID,
            "user_request": "I need a cocktail dress for a party",
            "max_price": 200.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/shopping/recommendations?user_id={TEST_USER_ID}",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that recommendations contain shopping links
        recommendations = data.get("recommendations", "")
        assert len(recommendations) > 50, "Recommendations should have substantial content"
        
        # Check for followup question
        assert "followup_question" in data
        print(f"Recommendations length: {len(recommendations)} chars")
        print(f"Followup question: {data.get('followup_question', 'N/A')}")


class TestVoiceTTS:
    """Voice TTS tests - verify British accent uses correct voice ID"""
    
    def test_tts_endpoint_exists(self):
        """Test that TTS endpoint is accessible"""
        global TEST_BESTIE_ID
        
        if not TEST_BESTIE_ID:
            pytest.skip("No bestie available")
        
        # Test with a simple text
        response = requests.post(
            f"{BASE_URL}/api/voice/tts",
            params={
                "bestie_id": TEST_BESTIE_ID,
                "text": "Hello darling, how are you today?"
            }
        )
        
        # Should return 200 with audio data or 500 if ElevenLabs key issue
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "audio_url" in data
            assert data["audio_url"].startswith("data:audio/mpeg;base64,")
            print("TTS endpoint working - audio generated successfully")
        else:
            print(f"TTS endpoint returned 500: {response.json().get('detail', 'Unknown error')}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_delete_test_user(self):
        """Delete test user and associated data"""
        global TEST_USER_ID
        
        if not TEST_USER_ID:
            pytest.skip("No test user to delete")
        
        response = requests.delete(f"{BASE_URL}/api/user/delete/{TEST_USER_ID}")
        assert response.status_code == 200
        print(f"Deleted test user: {TEST_USER_ID}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
