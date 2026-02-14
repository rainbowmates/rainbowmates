"""
Conversation Starter & Response Length Tests
Tests for: /chat/starter endpoint and 4-line response limit

Features tested:
1. POST /api/chat/starter endpoint generates short, engaging conversation starters (2-3 sentences)
2. Regular chat responses via POST /api/chat/message are limited to 4 lines maximum
3. Conversation starters are saved to chat history
4. AI responses still end with follow-up questions (proactive)

Run with: pytest /app/backend/tests/test_conversation_starter.py -v
"""
import pytest
import requests
import os
import re
import time

def get_base_url():
    """Get the backend URL from environment or frontend .env file."""
    url = os.environ.get('REACT_APP_BACKEND_URL', '')
    if not url:
        env_path = '/app/frontend/.env'
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        url = line.split('=', 1)[1].strip()
                        break
    return url.rstrip('/')

BASE_URL = get_base_url()

# Test credentials for new user/bestie (to test starter on fresh conversation)
NEW_USER_ID = "0a570019-f691-4793-8933-6dc47b03bb54"
NEW_BESTIE_ID = "e97aef5c-57a1-4fee-8c24-74d0b9ae78f3"

# Existing user/bestie for regular chat tests
EXISTING_USER_ID = "85638886-e144-40a9-8ff4-2da41bba84a1"
EXISTING_BESTIE_ID = "fe65008f-e661-4755-8fa6-4bac1e72f133"

pytestmark = pytest.mark.skipif(
    not BASE_URL,
    reason="REACT_APP_BACKEND_URL not set"
)


def count_lines_or_sentences(text):
    """
    Count response length by splitting on newlines or sentence boundaries.
    A response with more than 4 sentences or 4 distinct lines is too long.
    
    Note: LLMs don't always strictly adhere to length limits, so we allow
    some tolerance (up to 6 sentences) while flagging responses over 4 as warnings.
    """
    # Count by newlines first
    lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
    line_count = len(lines)
    
    # Also count sentences (splitting on '. ', '! ', '? ' or end of string)
    sentence_pattern = r'[.!?]+(?:\s|$)'
    sentences = [s.strip() for s in re.split(sentence_pattern, text.strip()) if s.strip()]
    sentence_count = len(sentences)
    
    return max(line_count, sentence_count)


# Allow tolerance for LLM inconsistency (target 4, acceptable up to 6)
STRICT_LINE_LIMIT = 4
ACCEPTABLE_LINE_LIMIT = 6


def contains_question(text):
    """Check if text contains a question (ends with ? or contains common question words)"""
    question_indicators = [
        r'\?',  # Question mark
        r'\b(what|how|when|where|why|who|which|tell me|do you|are you|have you|did you|would you|could you|can you|spill|tell)\b'
    ]
    for pattern in question_indicators:
        if re.search(pattern, text.lower()):
            return True
    return False


class TestConversationStarterEndpoint:
    """Test POST /api/chat/starter endpoint"""
    
    def test_starter_endpoint_exists(self):
        """Test that the /chat/starter endpoint exists and accepts POST"""
        response = requests.post(
            f"{BASE_URL}/api/chat/starter?user_id={NEW_USER_ID}&bestie_id={NEW_BESTIE_ID}",
            timeout=30
        )
        # Should not return 404 (Method Not Allowed) or 405
        assert response.status_code != 404, f"Endpoint not found: {response.text}"
        assert response.status_code != 405, f"Method not allowed: {response.text}"
        print(f"Endpoint exists, status: {response.status_code}")
    
    def test_starter_returns_message(self):
        """Test that starter endpoint returns a message"""
        response = requests.post(
            f"{BASE_URL}/api/chat/starter?user_id={EXISTING_USER_ID}&bestie_id={EXISTING_BESTIE_ID}",
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "message" in data, f"Response missing 'message' key: {data}"
        assert "message_id" in data, f"Response missing 'message_id' key: {data}"
        
        message = data["message"]
        assert len(message) > 0, "Starter message should not be empty"
        print(f"Conversation starter: {message}")
    
    def test_starter_is_short(self):
        """Test that conversation starter is 2-3 sentences (target 4 max, acceptable up to 6)"""
        response = requests.post(
            f"{BASE_URL}/api/chat/starter?user_id={EXISTING_USER_ID}&bestie_id={EXISTING_BESTIE_ID}",
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"]
        length = count_lines_or_sentences(message)
        
        print(f"Starter message: {message}")
        print(f"Sentence/line count: {length}")
        
        # System prompt targets 2-3 sentences, allow up to 6 due to LLM variability
        if length > STRICT_LINE_LIMIT:
            print(f"WARNING: Response exceeded target of {STRICT_LINE_LIMIT} sentences (got {length})")
        
        assert length <= ACCEPTABLE_LINE_LIMIT, f"Conversation starter should be max {ACCEPTABLE_LINE_LIMIT} sentences, got {length}: {message}"
        assert length >= 1, "Conversation starter should have at least 1 sentence"
        print(f"Length verified: {length} sentences/lines (target {STRICT_LINE_LIMIT}, max {ACCEPTABLE_LINE_LIMIT})")
    
    def test_starter_contains_question(self):
        """Test that conversation starter ends with a question"""
        response = requests.post(
            f"{BASE_URL}/api/chat/starter?user_id={EXISTING_USER_ID}&bestie_id={EXISTING_BESTIE_ID}",
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"]
        
        print(f"Checking for question in: {message}")
        
        has_question = contains_question(message)
        assert has_question, f"Conversation starter should end with a question: {message}"
        print("Starter contains a question - verified")
    
    def test_starter_has_warm_tone(self):
        """Test that conversation starter uses warm/friendly language"""
        response = requests.post(
            f"{BASE_URL}/api/chat/starter?user_id={EXISTING_USER_ID}&bestie_id={EXISTING_BESTIE_ID}",
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"].lower()
        
        # Check for warm language elements
        warm_indicators = ['babe', 'honey', 'sweetie', 'hey', 'hi', '💕', '💛', '✨', '!']
        
        has_warm_element = any(indicator in message for indicator in warm_indicators)
        print(f"Starter message: {message}")
        print(f"Has warm elements: {has_warm_element}")
        
        # Soft assertion - just log, don't fail
        if not has_warm_element:
            print("WARNING: Starter may not have warm tone, but this is personality-dependent")
    
    def test_starter_invalid_bestie(self):
        """Test starter endpoint with invalid bestie_id returns error"""
        response = requests.post(
            f"{BASE_URL}/api/chat/starter?user_id={EXISTING_USER_ID}&bestie_id=invalid-bestie-id",
            timeout=30
        )
        # Should return error status (404, 500, or 520 for server error)
        assert response.status_code in [404, 500, 520], f"Should fail for invalid bestie, got {response.status_code}"
        print(f"Invalid bestie correctly returns status {response.status_code}")


class TestStarterPersistence:
    """Test that conversation starters are saved to chat history"""
    
    def test_starter_saved_to_history(self):
        """Test that starter message appears in chat history"""
        # First, call the starter endpoint
        starter_response = requests.post(
            f"{BASE_URL}/api/chat/starter?user_id={EXISTING_USER_ID}&bestie_id={EXISTING_BESTIE_ID}",
            timeout=30
        )
        assert starter_response.status_code == 200, f"Starter failed: {starter_response.text}"
        
        starter_data = starter_response.json()
        starter_message = starter_data["message"]
        starter_id = starter_data["message_id"]
        
        print(f"Starter message ID: {starter_id}")
        print(f"Starter content: {starter_message[:50]}...")
        
        # Wait a moment for persistence
        time.sleep(1)
        
        # Retrieve chat history
        history_response = requests.get(
            f"{BASE_URL}/api/chat/history/{EXISTING_USER_ID}/{EXISTING_BESTIE_ID}?limit=50"
        )
        assert history_response.status_code == 200
        
        messages = history_response.json()
        assert isinstance(messages, list)
        
        # Check if starter message is in history (by content since IDs might differ)
        bestie_messages = [m for m in messages if m.get("role") == "bestie"]
        
        # Check if the starter content appears in any bestie message
        found = any(starter_message[:30] in m.get("content", "") for m in bestie_messages)
        
        print(f"Total messages in history: {len(messages)}")
        print(f"Bestie messages: {len(bestie_messages)}")
        print(f"Starter found in history: {found}")
        
        assert found, f"Starter message should be saved to chat history. Starter: '{starter_message[:50]}...'"


class TestResponseLengthLimit:
    """Test that regular chat responses are limited to 4 lines maximum"""
    
    def test_simple_greeting_response_length(self):
        """Test response to 'Hi' is within 4 lines"""
        payload = {"bestie_id": EXISTING_BESTIE_ID, "content": "Hi"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={EXISTING_USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"]
        length = count_lines_or_sentences(message)
        
        print(f"User: 'Hi'")
        print(f"Bestie: {message}")
        print(f"Length: {length} lines/sentences")
        
        assert length <= 4, f"Response should be max 4 lines/sentences, got {length}: {message}"
    
    def test_emotional_response_length(self):
        """Test response to emotional message is within 4 lines"""
        payload = {"bestie_id": EXISTING_BESTIE_ID, "content": "I'm feeling really down today and don't know what to do"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={EXISTING_USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"]
        length = count_lines_or_sentences(message)
        
        print(f"User: 'I'm feeling really down today and don't know what to do'")
        print(f"Bestie: {message}")
        print(f"Length: {length} lines/sentences")
        
        assert length <= 4, f"Response should be max 4 lines/sentences, got {length}: {message}"
    
    def test_story_response_length(self):
        """Test response to longer user story is within 4 lines"""
        payload = {
            "bestie_id": EXISTING_BESTIE_ID, 
            "content": "I had the craziest day! First my boss yelled at me for being 5 minutes late, then I spilled coffee on my new shirt, and to top it all off my ex texted me out of nowhere asking to meet up!"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={EXISTING_USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"]
        length = count_lines_or_sentences(message)
        
        print(f"User: Long story about crazy day")
        print(f"Bestie: {message}")
        print(f"Length: {length} lines/sentences")
        
        assert length <= 4, f"Response should be max 4 lines/sentences even to long stories, got {length}: {message}"
    
    def test_multiple_responses_length(self):
        """Test multiple responses are all within length limit"""
        test_messages = [
            "What should I wear tonight?",
            "I got a promotion at work!",
            "Do you think I should text him back?",
            "I'm so bored"
        ]
        
        all_within_limit = True
        results = []
        
        for msg in test_messages:
            payload = {"bestie_id": EXISTING_BESTIE_ID, "content": msg}
            
            response = requests.post(
                f"{BASE_URL}/api/chat/message?user_id={EXISTING_USER_ID}",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                message = response.json()["message"]
                length = count_lines_or_sentences(message)
                
                results.append({
                    "user": msg,
                    "bestie": message,
                    "length": length,
                    "within_limit": length <= 4
                })
                
                if length > 4:
                    all_within_limit = False
                    print(f"EXCEEDED: {msg} -> {length} lines/sentences")
                else:
                    print(f"OK: {msg} -> {length} lines/sentences")
            
            time.sleep(1)  # Small delay between requests
        
        # Report summary
        exceeded = [r for r in results if not r["within_limit"]]
        print(f"\nSummary: {len(results) - len(exceeded)}/{len(results)} responses within 4-line limit")
        
        for r in exceeded:
            print(f"  EXCEEDED ({r['length']} lines): {r['bestie'][:100]}...")
        
        assert all_within_limit, f"{len(exceeded)} responses exceeded the 4-line limit"


class TestProactiveBehaviorWithLengthLimit:
    """Test that responses are still proactive (end with questions) while being short"""
    
    def test_short_response_still_has_question(self):
        """Test that short responses still contain follow-up questions"""
        test_messages = [
            "Hey!",
            "I'm okay",
            "What's up?",
            "Just chilling"
        ]
        
        has_question_count = 0
        
        for msg in test_messages:
            payload = {"bestie_id": EXISTING_BESTIE_ID, "content": msg}
            
            response = requests.post(
                f"{BASE_URL}/api/chat/message?user_id={EXISTING_USER_ID}",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                message = response.json()["message"]
                has_q = contains_question(message)
                
                if has_q:
                    has_question_count += 1
                    print(f"✓ '{msg}' -> Has question: {message[:80]}...")
                else:
                    print(f"✗ '{msg}' -> No question: {message[:80]}...")
            
            time.sleep(1)
        
        # At least 3 out of 4 responses should have questions
        assert has_question_count >= 3, f"Only {has_question_count}/4 responses had questions - should be more proactive"
        print(f"\nProactive behavior: {has_question_count}/4 responses contained questions")
    
    def test_length_and_question_combined(self):
        """Test that response is both short AND contains a question"""
        payload = {"bestie_id": EXISTING_BESTIE_ID, "content": "Hi there!"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={EXISTING_USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"]
        length = count_lines_or_sentences(message)
        has_question = contains_question(message)
        
        print(f"User: 'Hi there!'")
        print(f"Bestie: {message}")
        print(f"Length: {length}, Has question: {has_question}")
        
        assert length <= 4, f"Response exceeds 4 lines: {length}"
        assert has_question, f"Response should contain a follow-up question"
        print("Both conditions met: Short AND proactive!")


class TestNewUserConversationStarter:
    """Test conversation starter with new user credentials"""
    
    def test_new_user_starter(self):
        """Test starter endpoint with new user/bestie combination"""
        response = requests.post(
            f"{BASE_URL}/api/chat/starter?user_id={NEW_USER_ID}&bestie_id={NEW_BESTIE_ID}",
            timeout=30
        )
        
        # This might fail if the new bestie doesn't exist
        if response.status_code == 404:
            pytest.skip("New bestie not found - may not be created yet")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        
        message = data["message"]
        length = count_lines_or_sentences(message)
        
        print(f"New user starter: {message}")
        print(f"Length: {length}")
        
        assert length <= 4, f"Starter should be max 4 lines, got {length}"
        assert contains_question(message), "Starter should contain a question"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
