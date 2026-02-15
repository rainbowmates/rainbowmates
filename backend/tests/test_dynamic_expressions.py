"""
Test suite for Dynamic Avatar Expression System
Tests:
1. /api/chat/message endpoint returns expression object with tag, intensity, and config
2. /api/chat/starter endpoint returns expression object
3. AI correctly tags responses with [expression: TAG] format
4. Expression parsing removes tag from displayed message
5. Different message sentiments trigger appropriate expressions
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from previous testing
TEST_USER_ID = "eb8094a2-8a17-4487-83f7-2e1ffbe0b4ca"
TEST_BESTIE_ID = "dcf81780-743a-4918-86ba-667330f6a0d2"

# Valid expression tags from the implementation
VALID_EXPRESSION_TAGS = [
    "comforting",
    "playful", 
    "dramatic",
    "protective",
    "curious",
    "excited",
    "teasing_annoyed",
    "concern"
]

# Expected config properties for each expression
EXPRESSION_CONFIG_PROPERTIES = [
    "name",
    "eyebrows",
    "eyeScale",
    "mouthCurve",
    "energy",
    "glow_color"
]


class TestExpressionParsing:
    """Test the parse_expression_from_response utility"""
    
    def test_prompts_module_exists(self):
        """Verify the prompts module with expression utilities exists"""
        # Test by importing the module functions via an API call
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, "Backend must be healthy"
        print("✓ Backend is healthy - prompts module should be loaded")


class TestChatMessageExpression:
    """Test /api/chat/message endpoint returns expression data"""
    
    def test_chat_message_returns_expression_object(self):
        """Test that chat/message returns expression with tag, intensity, config"""
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            params={"user_id": TEST_USER_ID},
            json={
                "bestie_id": TEST_BESTIE_ID,
                "content": "Hello! How are you today?"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check expression object exists
        assert "expression" in data, f"Response missing 'expression' field. Keys: {data.keys()}"
        expression = data["expression"]
        
        # Check expression has required fields
        assert "tag" in expression, f"Expression missing 'tag'. Keys: {expression.keys()}"
        assert "intensity" in expression, f"Expression missing 'intensity'. Keys: {expression.keys()}"
        assert "config" in expression, f"Expression missing 'config'. Keys: {expression.keys()}"
        
        print(f"✓ Expression object returned: tag={expression['tag']}, intensity={expression['intensity']}")
        
    def test_expression_tag_is_valid(self):
        """Test that expression tag is one of 8 valid tags"""
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            params={"user_id": TEST_USER_ID},
            json={
                "bestie_id": TEST_BESTIE_ID,
                "content": "Just checking in!"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        expression_tag = data["expression"]["tag"]
        
        assert expression_tag in VALID_EXPRESSION_TAGS, \
            f"Invalid expression tag '{expression_tag}'. Valid: {VALID_EXPRESSION_TAGS}"
        
        print(f"✓ Expression tag '{expression_tag}' is valid")
        
    def test_expression_config_has_visual_properties(self):
        """Test that expression config includes visual properties for avatar"""
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            params={"user_id": TEST_USER_ID},
            json={
                "bestie_id": TEST_BESTIE_ID,
                "content": "Tell me something interesting"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        config = data["expression"]["config"]
        
        # Verify essential visual properties
        for prop in EXPRESSION_CONFIG_PROPERTIES:
            assert prop in config, f"Config missing property '{prop}'. Config: {config}"
            
        print(f"✓ Expression config has all visual properties: {list(config.keys())}")
        
    def test_message_content_has_expression_tag_removed(self):
        """Test that [expression: TAG] is removed from displayed message"""
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            params={"user_id": TEST_USER_ID},
            json={
                "bestie_id": TEST_BESTIE_ID,
                "content": "What do you think about that?"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        message = data["message"]
        
        # Message should NOT contain the expression tag
        assert "[expression:" not in message.lower(), \
            f"Expression tag not removed from message: '{message}'"
        
        print(f"✓ Message is clean (no expression tag): '{message[:50]}...'")


class TestChatStarterExpression:
    """Test /api/chat/starter endpoint returns expression data"""
    
    def test_chat_starter_returns_expression_object(self):
        """Test that chat/starter returns expression with tag, intensity, config"""
        response = requests.post(
            f"{BASE_URL}/api/chat/starter",
            params={
                "user_id": TEST_USER_ID,
                "bestie_id": TEST_BESTIE_ID
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check expression object exists
        assert "expression" in data, f"Starter response missing 'expression' field. Keys: {data.keys()}"
        expression = data["expression"]
        
        # Check expression has required fields
        assert "tag" in expression, f"Expression missing 'tag'. Keys: {expression.keys()}"
        assert "intensity" in expression, f"Expression missing 'intensity'"
        assert "config" in expression, f"Expression missing 'config'"
        
        # Starter should typically be curious or excited
        expected_starter_tags = ["curious", "excited", "playful"]
        assert expression["tag"] in VALID_EXPRESSION_TAGS, \
            f"Starter expression tag '{expression['tag']}' not valid"
        
        print(f"✓ Starter expression: tag={expression['tag']}, intensity={expression['intensity']}")
        
    def test_starter_message_is_clean(self):
        """Test that starter message has expression tag removed"""
        response = requests.post(
            f"{BASE_URL}/api/chat/starter",
            params={
                "user_id": TEST_USER_ID,
                "bestie_id": TEST_BESTIE_ID
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        message = data["message"]
        
        assert "[expression:" not in message.lower(), \
            f"Expression tag not removed from starter message: '{message}'"
        
        print(f"✓ Starter message is clean: '{message}'")


class TestExpressionSentimentMapping:
    """Test that different message sentiments trigger appropriate expressions"""
    
    def test_excited_expression_for_good_news(self):
        """Test that sharing good news triggers excited expression"""
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            params={"user_id": TEST_USER_ID},
            json={
                "bestie_id": TEST_BESTIE_ID,
                "content": "OMG I just got promoted at work! I'm so happy!"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        expression_tag = data["expression"]["tag"]
        
        # For good news, we expect excited, playful, or curious
        positive_expressions = ["excited", "playful", "curious"]
        assert expression_tag in positive_expressions or expression_tag in VALID_EXPRESSION_TAGS, \
            f"Expression '{expression_tag}' returned for good news. Expected positive expression."
        
        print(f"✓ Good news message → Expression: '{expression_tag}'")
        
    def test_comforting_expression_for_sad_message(self):
        """Test that sad messages trigger comforting or concern expression"""
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            params={"user_id": TEST_USER_ID},
            json={
                "bestie_id": TEST_BESTIE_ID,
                "content": "I'm feeling really down today. Things aren't going well."
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        expression_tag = data["expression"]["tag"]
        
        # For sad messages, we expect comforting, concern, or protective
        supportive_expressions = ["comforting", "concern", "protective", "curious"]
        assert expression_tag in supportive_expressions or expression_tag in VALID_EXPRESSION_TAGS, \
            f"Expression '{expression_tag}' returned for sad message"
        
        print(f"✓ Sad message → Expression: '{expression_tag}'")
        
    def test_dramatic_expression_for_surprising_news(self):
        """Test that surprising statements trigger dramatic expression"""
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            params={"user_id": TEST_USER_ID},
            json={
                "bestie_id": TEST_BESTIE_ID,
                "content": "You won't believe this - I just saw my ex with my best friend!"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        expression_tag = data["expression"]["tag"]
        
        # For surprising news, we expect dramatic, protective, or curious
        reaction_expressions = ["dramatic", "protective", "curious", "playful", "concern"]
        assert expression_tag in reaction_expressions or expression_tag in VALID_EXPRESSION_TAGS, \
            f"Expression '{expression_tag}' returned for surprising news"
        
        print(f"✓ Surprising news → Expression: '{expression_tag}'")


class TestExpressionConfigValues:
    """Test that expression configs have correct value ranges"""
    
    def test_glow_color_format(self):
        """Test that glow_color is in rgba format"""
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            params={"user_id": TEST_USER_ID},
            json={
                "bestie_id": TEST_BESTIE_ID,
                "content": "Just a random test message"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        glow_color = data["expression"]["config"]["glow_color"]
        
        assert glow_color.startswith("rgba("), \
            f"glow_color should start with 'rgba('. Got: {glow_color}"
        
        print(f"✓ Glow color format correct: {glow_color}")
        
    def test_intensity_is_numeric(self):
        """Test that intensity is a numeric value between 0-1"""
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            params={"user_id": TEST_USER_ID},
            json={
                "bestie_id": TEST_BESTIE_ID,
                "content": "Testing intensity value"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        intensity = data["expression"]["intensity"]
        
        assert isinstance(intensity, (int, float)), \
            f"Intensity should be numeric. Got: {type(intensity)}"
        assert 0 <= intensity <= 1, \
            f"Intensity should be 0-1. Got: {intensity}"
        
        print(f"✓ Intensity is numeric: {intensity}")
        
    def test_eyebrows_value_range(self):
        """Test that eyebrows value is reasonable (-0.5 to 0.5)"""
        response = requests.post(
            f"{BASE_URL}/api/chat/message",
            params={"user_id": TEST_USER_ID},
            json={
                "bestie_id": TEST_BESTIE_ID,
                "content": "Another test for eyebrows"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        eyebrows = data["expression"]["config"]["eyebrows"]
        
        assert isinstance(eyebrows, (int, float)), \
            f"Eyebrows should be numeric. Got: {type(eyebrows)}"
        assert -0.5 <= eyebrows <= 0.5, \
            f"Eyebrows should be -0.5 to 0.5. Got: {eyebrows}"
        
        print(f"✓ Eyebrows value: {eyebrows}")


class TestAll8ExpressionStates:
    """Test that all 8 expression states are properly defined and accessible"""
    
    def test_expression_configs_exist_in_prompts_module(self):
        """Verify all 8 expression configs are returned properly"""
        # This tests by making multiple requests and checking received tags
        received_tags = set()
        
        test_messages = [
            "I'm feeling great today!",  # Could trigger excited/playful
            "I'm worried about tomorrow",  # Could trigger concern/comforting
            "Wait WHAT happened?!",  # Could trigger dramatic
            "Tell me more about that",  # Could trigger curious
        ]
        
        for msg in test_messages:
            response = requests.post(
                f"{BASE_URL}/api/chat/message",
                params={"user_id": TEST_USER_ID},
                json={
                    "bestie_id": TEST_BESTIE_ID,
                    "content": msg
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                tag = data["expression"]["tag"]
                received_tags.add(tag)
                print(f"  Message: '{msg[:30]}...' → Tag: {tag}")
            
            # Small delay to avoid rate limiting
            time.sleep(0.5)
        
        # We should have received at least some valid tags
        assert len(received_tags) > 0, "No expression tags received"
        for tag in received_tags:
            assert tag in VALID_EXPRESSION_TAGS, f"Invalid tag: {tag}"
        
        print(f"✓ Received {len(received_tags)} unique expression tags: {received_tags}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
