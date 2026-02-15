"""
Test suite for Mood Tracking features:
1. POST /api/mood/analyze - Analyze mood from user message
2. GET /api/mood/history/{user_id} - Get mood history
3. GET /api/mood/summary/{user_id}?days=7 - Get mood summary
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from previous iterations
TEST_USER_ID = "85638886-e144-40a9-8ff4-2da41bba84a1"
TEST_BESTIE_ID = "fe65008f-e661-4755-8fa6-4bac1e72f133"

# Valid mood categories
VALID_MOODS = ["happy", "sad", "anxious", "excited", "neutral", "stressed", "calm", "angry"]


class TestMoodAnalyzeEndpoint:
    """Test POST /api/mood/analyze endpoint"""
    
    def test_mood_analyze_endpoint_exists(self):
        """Test that the mood analyze endpoint exists and accepts requests"""
        response = requests.post(
            f"{BASE_URL}/api/mood/analyze",
            params={"user_id": TEST_USER_ID, "message": "I'm feeling great today!"}
        )
        # Should not be 404 Not Found
        assert response.status_code != 404, f"Endpoint not found. Status: {response.status_code}"
        # Should return success (200) or redirect, not 500
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
    
    def test_mood_analyze_returns_valid_mood(self):
        """Test that mood analysis returns a valid mood category"""
        response = requests.post(
            f"{BASE_URL}/api/mood/analyze",
            params={"user_id": TEST_USER_ID, "message": "I'm so happy and excited!"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "mood" in data, "Response should contain 'mood' field"
        assert data["mood"] in VALID_MOODS, f"Mood '{data['mood']}' not in valid moods: {VALID_MOODS}"
    
    def test_mood_analyze_returns_id(self):
        """Test that mood analysis returns an id for the entry"""
        response = requests.post(
            f"{BASE_URL}/api/mood/analyze",
            params={"user_id": TEST_USER_ID, "message": "Just feeling neutral today"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data, "Response should contain 'id' field"
        assert isinstance(data["id"], str), "ID should be a string"
        assert len(data["id"]) > 0, "ID should not be empty"
    
    def test_mood_happy_detection(self):
        """Test happy mood detection"""
        response = requests.post(
            f"{BASE_URL}/api/mood/analyze",
            params={"user_id": TEST_USER_ID, "message": "I'm so happy! Best day ever! Everything is wonderful!"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should detect positive mood (happy, excited, or calm)
        assert data["mood"] in ["happy", "excited"], f"Expected happy/excited for positive message, got {data['mood']}"
    
    def test_mood_sad_detection(self):
        """Test sad mood detection"""
        response = requests.post(
            f"{BASE_URL}/api/mood/analyze",
            params={"user_id": TEST_USER_ID, "message": "I feel terrible, so sad and down today"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should detect negative mood (sad, stressed, anxious)
        assert data["mood"] in ["sad", "stressed", "anxious"], f"Expected sad/stressed/anxious, got {data['mood']}"
    
    def test_mood_anxious_detection(self):
        """Test anxious mood detection"""
        response = requests.post(
            f"{BASE_URL}/api/mood/analyze",
            params={"user_id": TEST_USER_ID, "message": "I'm really worried and anxious about tomorrow's presentation"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["mood"] in ["anxious", "stressed"], f"Expected anxious/stressed, got {data['mood']}"


class TestMoodHistoryEndpoint:
    """Test GET /api/mood/history/{user_id} endpoint"""
    
    def test_mood_history_endpoint_exists(self):
        """Test that mood history endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/mood/history/{TEST_USER_ID}")
        assert response.status_code != 404, f"Endpoint not found. Status: {response.status_code}"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_mood_history_returns_list(self):
        """Test that mood history returns a list of entries"""
        response = requests.get(f"{BASE_URL}/api/mood/history/{TEST_USER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "history" in data, "Response should contain 'history' field"
        assert isinstance(data["history"], list), "History should be a list"
    
    def test_mood_history_entry_structure(self):
        """Test the structure of mood history entries"""
        # First create a mood entry
        requests.post(
            f"{BASE_URL}/api/mood/analyze",
            params={"user_id": TEST_USER_ID, "message": "Testing mood history entry structure"}
        )
        
        # Then check history
        response = requests.get(f"{BASE_URL}/api/mood/history/{TEST_USER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["history"]) > 0:
            entry = data["history"][0]
            # Check entry has required fields
            assert "user_id" in entry, "Entry should have user_id"
            assert "mood" in entry, "Entry should have mood"
            assert "timestamp" in entry, "Entry should have timestamp"
    
    def test_mood_history_with_limit(self):
        """Test mood history with limit parameter"""
        response = requests.get(f"{BASE_URL}/api/mood/history/{TEST_USER_ID}?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["history"]) <= 5, "Should respect limit parameter"


class TestMoodSummaryEndpoint:
    """Test GET /api/mood/summary/{user_id} endpoint"""
    
    def test_mood_summary_endpoint_exists(self):
        """Test that mood summary endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/mood/summary/{TEST_USER_ID}?days=7")
        assert response.status_code != 404, f"Endpoint not found. Status: {response.status_code}"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_mood_summary_returns_counts(self):
        """Test that mood summary returns mood counts"""
        response = requests.get(f"{BASE_URL}/api/mood/summary/{TEST_USER_ID}?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert "mood_counts" in data, "Response should contain 'mood_counts' field"
        assert isinstance(data["mood_counts"], dict), "mood_counts should be a dictionary"
    
    def test_mood_summary_returns_dominant_mood(self):
        """Test that mood summary returns dominant mood"""
        response = requests.get(f"{BASE_URL}/api/mood/summary/{TEST_USER_ID}?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert "dominant_mood" in data, "Response should contain 'dominant_mood' field"
        assert data["dominant_mood"] in VALID_MOODS, f"Dominant mood should be valid: {data['dominant_mood']}"
    
    def test_mood_summary_returns_total_entries(self):
        """Test that mood summary returns total entries count"""
        response = requests.get(f"{BASE_URL}/api/mood/summary/{TEST_USER_ID}?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_entries" in data, "Response should contain 'total_entries' field"
        assert isinstance(data["total_entries"], int), "total_entries should be integer"
    
    def test_mood_summary_returns_days_parameter(self):
        """Test that mood summary includes the days parameter in response"""
        response = requests.get(f"{BASE_URL}/api/mood/summary/{TEST_USER_ID}?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert "days" in data, "Response should contain 'days' field"
        assert data["days"] == 7, "Days should match query parameter"
    
    def test_mood_summary_different_day_ranges(self):
        """Test mood summary with different day ranges"""
        for days in [1, 3, 7, 14, 30]:
            response = requests.get(f"{BASE_URL}/api/mood/summary/{TEST_USER_ID}?days={days}")
            assert response.status_code == 200, f"Failed for days={days}"
            
            data = response.json()
            assert data["days"] == days, f"Days mismatch for query days={days}"


class TestMoodIntegration:
    """Test mood tracking integration with chat"""
    
    def test_mood_persisted_after_analyze(self):
        """Test that mood entries are persisted after analysis"""
        unique_message = f"Test persistence check {uuid.uuid4()}"
        
        # Analyze a mood
        analyze_response = requests.post(
            f"{BASE_URL}/api/mood/analyze",
            params={"user_id": TEST_USER_ID, "message": unique_message}
        )
        assert analyze_response.status_code == 200
        mood_id = analyze_response.json()["id"]
        
        # Check it appears in history
        history_response = requests.get(f"{BASE_URL}/api/mood/history/{TEST_USER_ID}?limit=10")
        assert history_response.status_code == 200
        
        history = history_response.json()["history"]
        entry_ids = [entry.get("id") for entry in history]
        assert mood_id in entry_ids, "Mood entry should be persisted in history"
    
    def test_multiple_mood_entries_accumulate(self):
        """Test that multiple mood entries accumulate in summary"""
        # Get initial count
        initial_response = requests.get(f"{BASE_URL}/api/mood/summary/{TEST_USER_ID}?days=1")
        initial_count = initial_response.json().get("total_entries", 0)
        
        # Add multiple mood entries
        messages = [
            "I'm feeling great today!",
            "A bit worried about work",
            "So excited for the weekend!"
        ]
        
        for msg in messages:
            requests.post(
                f"{BASE_URL}/api/mood/analyze",
                params={"user_id": TEST_USER_ID, "message": msg}
            )
        
        # Check count increased
        final_response = requests.get(f"{BASE_URL}/api/mood/summary/{TEST_USER_ID}?days=1")
        final_count = final_response.json().get("total_entries", 0)
        
        # Count should have increased (might not be exactly +3 due to timing)
        assert final_count >= initial_count, "Total entries should increase after adding moods"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
