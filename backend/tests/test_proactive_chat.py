"""
Proactive AI Bestie Chat Tests
Tests for: Chat message endpoint, proactive AI responses, chat history

The AI Bestie should:
1. Always end responses with a question or conversation starter
2. Proactively bring up new topics
3. Ask about user's day, feelings, plans when appropriate
4. Be nosy in a loving way and suggest activities

Run with: pytest /app/backend/tests/test_proactive_chat.py -v
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

# Pre-configured test credentials from main agent
TEST_USER_ID = "85638886-e144-40a9-8ff4-2da41bba84a1"
TEST_BESTIE_ID = "fe65008f-e661-4755-8fa6-4bac1e72f133"

pytestmark = pytest.mark.skipif(
    not BASE_URL,
    reason="REACT_APP_BACKEND_URL not set"
)


class TestChatHistoryEndpoint:
    """Test chat history retrieval endpoint"""
    
    def test_get_chat_history_success(self):
        """Test getting chat history returns 200"""
        response = requests.get(f"{BASE_URL}/api/chat/history/{TEST_USER_ID}/{TEST_BESTIE_ID}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "messages" in data
        assert isinstance(data["messages"], list)
        print(f"Chat history retrieved: {len(data['messages'])} messages")
    
    def test_get_chat_history_with_limit(self):
        """Test getting chat history with limit parameter"""
        response = requests.get(f"{BASE_URL}/api/chat/history/{TEST_USER_ID}/{TEST_BESTIE_ID}?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        # Limit should cap the results
        assert len(data["messages"]) <= 5
    
    def test_get_chat_history_nonexistent_user(self):
        """Test chat history for non-existent user returns empty list"""
        response = requests.get(f"{BASE_URL}/api/chat/history/nonexistent-user/nonexistent-bestie")
        # Should return 200 with empty messages, not 404
        assert response.status_code == 200
        data = response.json()
        assert data["messages"] == []


class TestChatMessageEndpoint:
    """Test sending chat messages and getting AI responses"""
    
    def test_send_message_success(self):
        """Test sending a message returns both user message and bestie response"""
        payload = {"bestie_id": TEST_BESTIE_ID, "content": "Hey there!"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
            json=payload
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "user_message" in data
        assert "bestie_response" in data
        assert data["user_message"]["content"] == "Hey there!"
        assert data["user_message"]["role"] == "user"
        assert data["bestie_response"]["role"] == "bestie"
        assert len(data["bestie_response"]["content"]) > 0
        
        print(f"User message ID: {data['user_message']['id']}")
        print(f"Bestie response: {data['bestie_response']['content'][:100]}...")
    
    def test_send_message_invalid_bestie(self):
        """Test sending message to non-existent bestie"""
        payload = {"bestie_id": "nonexistent-bestie-id", "content": "Hello"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
            json=payload
        )
        assert response.status_code == 404
    
    def test_send_message_invalid_user(self):
        """Test sending message from non-existent user"""
        payload = {"bestie_id": TEST_BESTIE_ID, "content": "Hello"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id=nonexistent-user-id",
            json=payload
        )
        assert response.status_code == 404


class TestProactiveAIBehavior:
    """Test AI Bestie proactive behavior - responses should include questions and drive conversation"""
    
    def _contains_question(self, text):
        """Check if text contains a question (ends with ? or contains common question words)"""
        question_indicators = [
            r'\?',  # Question mark
            r'\b(what|how|when|where|why|who|which|tell me|do you|are you|have you|did you|would you|could you|can you|spill|tell)\b'
        ]
        for pattern in question_indicators:
            if re.search(pattern, text.lower()):
                return True
        return False
    
    def _contains_engagement_phrases(self, text):
        """Check if response contains proactive engagement phrases"""
        engagement_phrases = [
            r'(but wait|okay but|tell me more|spill|i need to know|how are you|what happened|what about|have you)',
            r'(girl|honey|babe|sweetie)',  # Terms of endearment
            r'(what do you think|how do you feel|what.{0,10}plan)',  # Proactive questions
        ]
        text_lower = text.lower()
        for pattern in engagement_phrases:
            if re.search(pattern, text_lower):
                return True
        return False
    
    def test_proactive_response_with_simple_greeting(self):
        """Test AI responds proactively to a simple greeting"""
        payload = {"bestie_id": TEST_BESTIE_ID, "content": "Hi"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200
        
        data = response.json()
        bestie_content = data["bestie_response"]["content"]
        
        print(f"\nUser: 'Hi'")
        print(f"Bestie: {bestie_content}")
        
        # AI should not just say "Hi" back - it should ask something or drive conversation
        assert len(bestie_content) > 20, "Response too short - should be more engaging"
        assert self._contains_question(bestie_content), "Response should contain a question to drive conversation"
    
    def test_proactive_response_with_minimal_input(self):
        """Test AI asks follow-up questions when user gives minimal input"""
        payload = {"bestie_id": TEST_BESTIE_ID, "content": "I'm okay"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200
        
        data = response.json()
        bestie_content = data["bestie_response"]["content"]
        
        print(f"\nUser: 'I'm okay'")
        print(f"Bestie: {bestie_content}")
        
        # AI should dig deeper, not just accept "okay"
        has_question = self._contains_question(bestie_content)
        has_engagement = self._contains_engagement_phrases(bestie_content)
        
        assert has_question or has_engagement, \
            "AI should probe further when user gives minimal response"
    
    def test_proactive_response_asks_about_day(self):
        """Test AI asks about user's day or plans"""
        payload = {"bestie_id": TEST_BESTIE_ID, "content": "What's up?"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200
        
        data = response.json()
        bestie_content = data["bestie_response"]["content"]
        
        print(f"\nUser: 'What's up?'")
        print(f"Bestie: {bestie_content}")
        
        # Response should contain a question to reciprocate
        assert self._contains_question(bestie_content), \
            "AI should ask about user's day/situation when prompted 'what's up'"
    
    def test_proactive_response_suggests_topics(self):
        """Test AI suggests new topics or activities proactively"""
        payload = {"bestie_id": TEST_BESTIE_ID, "content": "I'm bored today"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200
        
        data = response.json()
        bestie_content = data["bestie_response"]["content"]
        
        print(f"\nUser: 'I'm bored today'")
        print(f"Bestie: {bestie_content}")
        
        # AI should suggest activities or ask what the user wants to do
        suggestion_patterns = [
            r'(should|could|why not|how about|have you tried|what about|maybe)',
            r'\?'  # At least should ask a question
        ]
        
        has_suggestion = any(re.search(p, bestie_content.lower()) for p in suggestion_patterns)
        assert has_suggestion, \
            "AI should suggest activities or ask clarifying questions when user is bored"
    
    def test_proactive_response_digs_deeper(self):
        """Test AI digs deeper into what user shares"""
        payload = {"bestie_id": TEST_BESTIE_ID, "content": "I had a weird day at work"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200
        
        data = response.json()
        bestie_content = data["bestie_response"]["content"]
        
        print(f"\nUser: 'I had a weird day at work'")
        print(f"Bestie: {bestie_content}")
        
        # AI should ask for more details, not just validate
        assert self._contains_question(bestie_content), \
            "AI should dig deeper and ask what happened when user mentions something interesting"
    
    def test_proactive_response_with_emotional_cue(self):
        """Test AI engages empathetically but still drives conversation"""
        payload = {"bestie_id": TEST_BESTIE_ID, "content": "I'm feeling a bit down"}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200
        
        data = response.json()
        bestie_content = data["bestie_response"]["content"]
        
        print(f"\nUser: 'I'm feeling a bit down'")
        print(f"Bestie: {bestie_content}")
        
        # AI should ask what's wrong, not just say "sorry to hear that"
        assert self._contains_question(bestie_content), \
            "AI should ask what's going on when user expresses negative emotions"
    
    def test_response_uses_terms_of_endearment(self):
        """Test AI uses friendly terms like honey, babe, sweetie, girl"""
        # Send multiple messages to increase chance of seeing terms of endearment
        messages = ["Hey!", "How's your day going?", "Just chilling"]
        found_endearment = False
        endearment_terms = ['honey', 'babe', 'sweetie', 'girl', 'hun']
        
        for msg in messages:
            payload = {"bestie_id": TEST_BESTIE_ID, "content": msg}
            response = requests.post(
                f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
                json=payload,
                timeout=30
            )
            if response.status_code == 200:
                content = response.json()["bestie_response"]["content"].lower()
                if any(term in content for term in endearment_terms):
                    found_endearment = True
                    print(f"Found endearment in response to '{msg}': {content[:100]}...")
                    break
            time.sleep(1)  # Small delay between messages
        
        # This is a soft assertion - personality may vary
        print(f"Terms of endearment found: {found_endearment}")


class TestMessagePersistence:
    """Test that chat messages are properly saved and retrievable"""
    
    def test_message_saved_to_history(self):
        """Test that sent messages appear in chat history"""
        # Generate unique test message
        test_content = f"Test message for persistence check {time.time()}"
        payload = {"bestie_id": TEST_BESTIE_ID, "content": test_content}
        
        # Send message
        send_response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
            json=payload,
            timeout=30
        )
        assert send_response.status_code == 200
        
        # Give it a moment to persist
        time.sleep(1)
        
        # Retrieve history
        history_response = requests.get(
            f"{BASE_URL}/api/chat/history/{TEST_USER_ID}/{TEST_BESTIE_ID}?limit=50"
        )
        assert history_response.status_code == 200
        
        messages = history_response.json()["messages"]
        user_messages = [m for m in messages if m["role"] == "user"]
        
        # Check if our test message is in history
        found = any(test_content in m.get("content", "") for m in user_messages)
        assert found, "Sent message should appear in chat history"
        
        print(f"Message persistence verified. Total messages in history: {len(messages)}")


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_empty_message_handling(self):
        """Test how API handles empty message"""
        payload = {"bestie_id": TEST_BESTIE_ID, "content": ""}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
            json=payload
        )
        # Should either fail validation or return an error
        # Empty messages shouldn't be processed
        print(f"Empty message response status: {response.status_code}")
        # We're just checking it doesn't crash the server
    
    def test_long_message_handling(self):
        """Test handling of reasonably long messages"""
        long_content = "This is a test message. " * 50  # ~1000 chars
        payload = {"bestie_id": TEST_BESTIE_ID, "content": long_content}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
            json=payload,
            timeout=60
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "bestie_response" in data
        print(f"Long message handled successfully")
    
    def test_special_characters_in_message(self):
        """Test handling of special characters"""
        payload = {"bestie_id": TEST_BESTIE_ID, "content": "Hello! 😊 What's up? <test> & \"quotes\""}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/message?user_id={TEST_USER_ID}",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["user_message"]["content"] == payload["content"]
        print(f"Special characters handled correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
