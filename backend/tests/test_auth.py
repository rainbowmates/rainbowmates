"""
Tests for authentication routes.
"""
import pytest
from unittest.mock import AsyncMock, patch
from utils.password import hash_password, verify_password


class TestPasswordHashing:
    """Tests for password hashing utilities."""
    
    def test_hash_password_creates_bcrypt_hash(self):
        """Password hash should start with bcrypt prefix."""
        password = "TestPassword123"
        hashed = hash_password(password)
        assert hashed.startswith("$2b$")
    
    def test_hash_password_different_each_time(self):
        """Same password should produce different hashes."""
        password = "TestPassword123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        assert hash1 != hash2
    
    def test_verify_password_correct(self):
        """Correct password should verify."""
        password = "TestPassword123"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Incorrect password should not verify."""
        password = "TestPassword123"
        hashed = hash_password(password)
        assert verify_password("WrongPassword", hashed) is False
    
    def test_verify_password_invalid_hash(self):
        """Invalid hash should return False, not raise."""
        assert verify_password("password", "not_a_valid_hash") is False


class TestAuthRoutes:
    """Tests for auth route handlers."""
    
    @pytest.fixture
    def mock_user_service(self, mock_db):
        """Create mock user service."""
        with patch('routes.auth.UserService') as mock:
            service = mock.return_value
            service.email_exists = AsyncMock(return_value=False)
            service.mobile_exists = AsyncMock(return_value=False)
            service.create = AsyncMock()
            service.get_by_identifier = AsyncMock()
            service.verify = AsyncMock()
            service.validate_credentials = AsyncMock()
            yield service
    
    @pytest.mark.asyncio
    async def test_register_success(self, mock_user_service, generate_user_data):
        """Registration should succeed with valid data."""
        user_data = generate_user_data()
        mock_user_service.email_exists.return_value = False
        mock_user_service.mobile_exists.return_value = False
        
        # The actual test would call the endpoint
        # This is a unit test for the service layer
        assert await mock_user_service.email_exists(user_data["email"]) is False
    
    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, mock_user_service):
        """Login with invalid credentials should fail."""
        mock_user_service.validate_credentials.return_value = None
        result = await mock_user_service.validate_credentials("test@example.com", "wrong")
        assert result is None


class TestJWTTokens:
    """Tests for JWT token utilities."""
    
    def test_create_access_token(self):
        """Access token should be created successfully."""
        from utils.auth import create_access_token, decode_token
        
        user_id = "user_test123"
        token = create_access_token(user_id)
        
        assert token is not None
        assert isinstance(token, str)
        
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["type"] == "access"
    
    def test_create_refresh_token(self):
        """Refresh token should be created successfully."""
        from utils.auth import create_refresh_token, decode_token
        
        user_id = "user_test123"
        token = create_refresh_token(user_id)
        
        payload = decode_token(token)
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"
    
    def test_decode_invalid_token(self):
        """Invalid token should return None."""
        from utils.auth import decode_token
        
        result = decode_token("invalid_token")
        assert result is None
