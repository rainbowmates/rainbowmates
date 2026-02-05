"""
Pytest configuration and shared fixtures.
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone

# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_db():
    """Create a mock database for testing."""
    db = MagicMock()
    
    # Mock collections
    db.users = AsyncMock()
    db.besties = AsyncMock()
    db.chat_messages = AsyncMock()
    db.subscriptions = AsyncMock()
    db.payment_transactions = AsyncMock()
    db.password_reset_otps = AsyncMock()
    
    return db


@pytest.fixture
def sample_user():
    """Sample user data for testing."""
    return {
        "id": "user_test123",
        "first_name": "Test",
        "surname": "User",
        "email": "test@example.com",
        "mobile": "+1234567890",
        "password": "$2b$12$test_hashed_password",
        "dob": "1990-01-01",
        "is_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }


@pytest.fixture
def sample_bestie():
    """Sample bestie data for testing."""
    return {
        "id": "bestie_test123",
        "user_id": "user_test123",
        "name": "Alex",
        "image_url": "https://example.com/avatar.png",
        "personality": ["supportive", "fun", "sassy"],
        "interests": ["fashion", "music", "movies"],
        "accent": "British",
        "created_at": datetime.now(timezone.utc).isoformat()
    }


@pytest.fixture
def sample_message():
    """Sample message data for testing."""
    return {
        "message_id": "msg_test123",
        "user_id": "user_test123",
        "bestie_id": "bestie_test123",
        "role": "user",
        "content": "Hello bestie!",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@pytest.fixture
def auth_headers():
    """Sample authorization headers."""
    return {"Authorization": "Bearer test_token_123"}


@pytest.fixture
def sample_subscription():
    """Sample subscription data for testing."""
    return {
        "user_id": "user_test123",
        "plan": "1_month",
        "amount": 999,
        "start_date": datetime.now(timezone.utc).isoformat(),
        "end_date": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
        "stripe_session_id": "cs_test_123"
    }


# API client fixtures
@pytest.fixture
def api_base_url():
    """Base URL for API testing."""
    return "http://localhost:8001/api"


# Test data generators
@pytest.fixture
def generate_user_data():
    """Factory fixture to generate user data."""
    def _generate(email_prefix="test"):
        import uuid
        unique_id = uuid.uuid4().hex[:8]
        return {
            "first_name": "Test",
            "surname": "User",
            "email": f"{email_prefix}_{unique_id}@example.com",
            "mobile": f"+1{unique_id}000",
            "password": "TestPassword123",
            "dob": "1990-01-01"
        }
    return _generate


@pytest.fixture
def generate_bestie_data():
    """Factory fixture to generate bestie data."""
    def _generate(name="Alex"):
        return {
            "name": name,
            "image_url": "https://example.com/avatar.png",
            "personality": ["supportive", "fun"],
            "interests": ["fashion", "music"],
            "accent": "British"
        }
    return _generate
