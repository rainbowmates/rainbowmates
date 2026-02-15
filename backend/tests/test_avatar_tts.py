"""
Backend API tests for Avatar TTS (Talking Avatar) feature.
Tests: /api/avatar/speak, /api/avatar/usage endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAvatarSpeakEndpoint:
    """Tests for POST /api/avatar/speak - Avatar TTS generation"""
    
    def test_avatar_speak_endpoint_exists(self):
        """Verify the avatar speak endpoint exists and accepts POST"""
        response = requests.post(
            f"{BASE_URL}/api/avatar/speak",
            json={
                "text": "Hello!",
                "user_id": "test-user-123",
                "bestie_id": "test-bestie-123",
                "emotion": "friendly"
            }
        )
        # Should return 200 or 500 (if api key issue), but not 404
        assert response.status_code != 404, "Avatar speak endpoint not found"
    
    def test_avatar_speak_returns_success(self):
        """Test that avatar speak returns success with audio data"""
        response = requests.post(
            f"{BASE_URL}/api/avatar/speak",
            json={
                "text": "Hey babe!",
                "user_id": "test-avatar-user",
                "bestie_id": "test-avatar-bestie",
                "emotion": "friendly"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success=True"
        assert "audio_url" in data, "Missing audio_url in response"
        assert data["audio_url"].startswith("data:audio/mpeg;base64,"), "Invalid audio URL format"
    
    def test_avatar_speak_returns_emotion_payload(self):
        """Test that avatar speak returns emotion payload for animation"""
        response = requests.post(
            f"{BASE_URL}/api/avatar/speak",
            json={
                "text": "I love this!",
                "user_id": "test-emotion-user",
                "bestie_id": "test-emotion-bestie",
                "emotion": "excited"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "emotion_payload" in data, "Missing emotion_payload in response"
        
        emotion_payload = data["emotion_payload"]
        assert "emotion" in emotion_payload, "Missing emotion in emotion_payload"
        assert "expression_intensity" in emotion_payload, "Missing expression_intensity"
        assert "estimated_duration_ms" in emotion_payload, "Missing estimated_duration_ms"
        assert "animation_hints" in emotion_payload, "Missing animation_hints"
    
    def test_avatar_speak_returns_usage_stats(self):
        """Test that avatar speak returns usage statistics"""
        response = requests.post(
            f"{BASE_URL}/api/avatar/speak",
            json={
                "text": "Quick test!",
                "user_id": "test-usage-user",
                "bestie_id": "test-usage-bestie",
                "emotion": "friendly"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "usage" in data, "Missing usage in response"
        
        usage = data["usage"]
        assert "used" in usage, "Missing used count"
        assert "limit" in usage, "Missing limit"
        assert "remaining" in usage, "Missing remaining count"
    
    def test_avatar_speak_different_emotions(self):
        """Test avatar speak with different emotion types"""
        emotions = ["friendly", "excited", "comforting", "playful", "warm"]
        
        for emotion in emotions:
            response = requests.post(
                f"{BASE_URL}/api/avatar/speak",
                json={
                    "text": f"Testing {emotion}!",
                    "user_id": f"test-emotion-{emotion}",
                    "bestie_id": "test-bestie",
                    "emotion": emotion
                }
            )
            assert response.status_code == 200, f"Failed for emotion '{emotion}': {response.text}"
            
            data = response.json()
            assert data.get("success") == True, f"Expected success for emotion '{emotion}'"


class TestAvatarUsageEndpoint:
    """Tests for GET /api/avatar/usage/{user_id} - Usage statistics"""
    
    def test_usage_endpoint_exists(self):
        """Verify the usage endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/avatar/usage/test-user-123")
        assert response.status_code != 404, "Avatar usage endpoint not found"
    
    def test_usage_returns_stats(self):
        """Test that usage endpoint returns statistics"""
        response = requests.get(f"{BASE_URL}/api/avatar/usage/usage-test-user")
        assert response.status_code == 200
        
        data = response.json()
        assert "allowed" in data, "Missing 'allowed' field"
        assert "used" in data, "Missing 'used' field"
        assert "limit" in data, "Missing 'limit' field"
        assert "remaining" in data, "Missing 'remaining' field"
        
        # Verify types
        assert isinstance(data["allowed"], bool), "'allowed' should be boolean"
        assert isinstance(data["used"], int), "'used' should be integer"
        assert isinstance(data["limit"], int), "'limit' should be integer"
        assert isinstance(data["remaining"], int), "'remaining' should be integer"


class TestHealthEndpoint:
    """Basic health check to verify backend is running"""
    
    def test_health_endpoint(self):
        """Verify health endpoint returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "degraded"]
    
    def test_elevenlabs_configured(self):
        """Verify ElevenLabs is configured in health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        components = data.get("components", {})
        external = components.get("external_services", {})
        elevenlabs = external.get("elevenlabs", {})
        
        assert elevenlabs.get("status") == "healthy", "ElevenLabs not configured properly"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
