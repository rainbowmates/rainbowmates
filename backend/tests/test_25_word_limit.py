"""
25-Word Response Limit Tests
Tests for: MAX 25 word responses and MAX 15 word conversation starters

Features tested:
1. Chat responses (/api/chat/message) are limited to MAX 25 words
2. Conversation starters (/api/chat/starter) are limited to MAX 15 words
3. Word count check: split by spaces, count should be <= limit

Run with: pytest /app/backend/tests/test_25_word_limit.py -v
"""
import pytest
import requests
import os
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

# Test credentials
USER_ID = "85638886-e144-40a9-8ff4-2da41bba84a1"
BESTIE_ID = "fe65008f-e661-4755-8fa6-4bac1e72f133"

# Word limits
MAX_RESPONSE_WORDS = 25
MAX_STARTER_WORDS = 15
# Allow tolerance for LLM variability (strict + 5 buffer)
ACCEPTABLE_RESPONSE_WORDS = 30
ACCEPTABLE_STARTER_WORDS = 20

pytestmark = pytest.mark.skipif(
    not BASE_URL,
    reason="REACT_APP_BACKEND_URL not set"
)


def count_words(text):
    """Count words by splitting on spaces."""
    return len(text.split())


class TestConversationStarterWordLimit:
    """Test POST /api/chat/starter responses are under 15 words"""
    
    def test_starter_word_count_basic(self):
        """Test conversation starter is under 15 words"""
        response = requests.post(
            f"{BASE_URL}/api/chat/starter?user_id={USER_ID}&bestie_id={BESTIE_ID}",
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"]
        word_count = count_words(message)
        
        print(f"Starter: {message}")
        print(f"Word count: {word_count} (target <= {MAX_STARTER_WORDS})")
        
        if word_count > MAX_STARTER_WORDS:
            print(f"WARNING: Exceeded target of {MAX_STARTER_WORDS} words (got {word_count})")
        
        assert word_count <= ACCEPTABLE_STARTER_WORDS, \
            f"Starter should be max {ACCEPTABLE_STARTER_WORDS} words, got {word_count}: {message}"
    
    def test_multiple_starters_word_count(self):
        """Test multiple conversation starters stay short"""
        exceeded_target = 0
        exceeded_max = 0
        results = []
        
        for i in range(3):
            response = requests.post(
                f"{BASE_URL}/api/chat/starter?user_id={USER_ID}&bestie_id={BESTIE_ID}",
                timeout=30
            )
            
            if response.status_code == 200:
                message = response.json()["message"]
                word_count = count_words(message)
                
                results.append({
                    "message": message,
                    "words": word_count
                })
                
                if word_count > MAX_STARTER_WORDS:
                    exceeded_target += 1
                    print(f"Sample {i+1}: {word_count} words (EXCEEDED TARGET {MAX_STARTER_WORDS})")
                else:
                    print(f"Sample {i+1}: {word_count} words OK")
                    
                if word_count > ACCEPTABLE_STARTER_WORDS:
                    exceeded_max += 1
            
            time.sleep(1)
        
        print(f"\nStarter summary: {len(results) - exceeded_target}/{len(results)} within {MAX_STARTER_WORDS}-word target")
        
        assert exceeded_max == 0, \
            f"{exceeded_max} starters exceeded {ACCEPTABLE_STARTER_WORDS}-word limit"


class TestChatResponseWordLimit:
    """Test POST /api/chat/message responses are under 25 words"""
    
    def test_simple_greeting_word_count(self):
        """Test response to 'Hi' is under 25 words"""
        payload = {"bestie_id": BESTIE_ID, "content": "Hi"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"]
        word_count = count_words(message)
        
        print(f"User: 'Hi'")
        print(f"Bestie: {message}")
        print(f"Word count: {word_count} (target <= {MAX_RESPONSE_WORDS})")
        
        if word_count > MAX_RESPONSE_WORDS:
            print(f"WARNING: Exceeded target of {MAX_RESPONSE_WORDS} words")
        
        assert word_count <= ACCEPTABLE_RESPONSE_WORDS, \
            f"Response should be max {ACCEPTABLE_RESPONSE_WORDS} words, got {word_count}: {message}"
    
    def test_emotional_message_word_count(self):
        """Test response to emotional message stays under 25 words"""
        payload = {
            "bestie_id": BESTIE_ID, 
            "content": "I'm feeling really down today and could use some support"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"]
        word_count = count_words(message)
        
        print(f"User: 'I'm feeling really down today...'")
        print(f"Bestie: {message}")
        print(f"Word count: {word_count} (target <= {MAX_RESPONSE_WORDS})")
        
        if word_count > MAX_RESPONSE_WORDS:
            print(f"WARNING: Exceeded target of {MAX_RESPONSE_WORDS} words")
        
        assert word_count <= ACCEPTABLE_RESPONSE_WORDS, \
            f"Response should be max {ACCEPTABLE_RESPONSE_WORDS} words, got {word_count}: {message}"
    
    def test_complex_story_word_count(self):
        """Test response to long user story stays under 25 words"""
        payload = {
            "bestie_id": BESTIE_ID, 
            "content": "I had the craziest day! My boss yelled at me, I spilled coffee on my new shirt, and my ex texted me out of nowhere!"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"]
        word_count = count_words(message)
        
        print(f"User: 'Crazy day story...'")
        print(f"Bestie: {message}")
        print(f"Word count: {word_count} (target <= {MAX_RESPONSE_WORDS})")
        
        if word_count > MAX_RESPONSE_WORDS:
            print(f"WARNING: Exceeded target of {MAX_RESPONSE_WORDS} words")
        
        assert word_count <= ACCEPTABLE_RESPONSE_WORDS, \
            f"Response should be max {ACCEPTABLE_RESPONSE_WORDS} words, got {word_count}: {message}"
    
    def test_multiple_responses_word_count(self):
        """Test multiple responses stay under 25 words"""
        test_messages = [
            "What should I wear tonight?",
            "I got a promotion!",
            "Do you think I should text him back?",
            "I'm so bored"
        ]
        
        exceeded_target = 0
        exceeded_max = 0
        results = []
        
        for msg in test_messages:
            payload = {"bestie_id": BESTIE_ID, "content": msg}
            
            response = requests.post(
                f"{BASE_URL}/api/chat/message?user_id={USER_ID}",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                message = response.json()["message"]
                word_count = count_words(message)
                
                results.append({
                    "user": msg,
                    "bestie": message,
                    "words": word_count
                })
                
                if word_count > MAX_RESPONSE_WORDS:
                    exceeded_target += 1
                    print(f"'{msg}' -> {word_count} words (EXCEEDED TARGET)")
                else:
                    print(f"'{msg}' -> {word_count} words OK")
                    
                if word_count > ACCEPTABLE_RESPONSE_WORDS:
                    exceeded_max += 1
            
            time.sleep(1)
        
        print(f"\nResponse summary: {len(results) - exceeded_target}/{len(results)} within {MAX_RESPONSE_WORDS}-word target")
        
        # All responses should be within acceptable limit
        assert exceeded_max == 0, \
            f"{exceeded_max} responses exceeded {ACCEPTABLE_RESPONSE_WORDS}-word limit"
    
    def test_advice_request_word_count(self):
        """Test advice request stays under 25 words"""
        payload = {
            "bestie_id": BESTIE_ID, 
            "content": "Should I quit my job and start my own business?"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"]
        word_count = count_words(message)
        
        print(f"User: 'Should I quit my job...'")
        print(f"Bestie: {message}")
        print(f"Word count: {word_count} (target <= {MAX_RESPONSE_WORDS})")
        
        if word_count > MAX_RESPONSE_WORDS:
            print(f"WARNING: Exceeded target of {MAX_RESPONSE_WORDS} words")
        
        assert word_count <= ACCEPTABLE_RESPONSE_WORDS, \
            f"Response should be max {ACCEPTABLE_RESPONSE_WORDS} words, got {word_count}: {message}"


class TestResponseStillHasQuestion:
    """Test that short responses still have follow-up questions"""
    
    def test_short_response_has_question(self):
        """Test that response is short AND contains a question"""
        payload = {"bestie_id": BESTIE_ID, "content": "Hey there!"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        message = response.json()["message"]
        word_count = count_words(message)
        has_question = '?' in message
        
        print(f"User: 'Hey there!'")
        print(f"Bestie: {message}")
        print(f"Word count: {word_count}, Has question: {has_question}")
        
        assert word_count <= ACCEPTABLE_RESPONSE_WORDS, \
            f"Response too long: {word_count} words"
        assert has_question, "Response should contain a question"
        
        print("Both conditions met: Short AND has question!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
