"""
Tests for utility modules.
"""
import pytest
import asyncio
from datetime import datetime, timezone


class TestCache:
    """Tests for caching utilities."""
    
    @pytest.mark.asyncio
    async def test_cache_set_get(self):
        """Should set and get values."""
        from utils.cache import SimpleCache
        
        cache = SimpleCache(default_ttl=60)
        await cache.set("test_key", "test_value")
        
        result = await cache.get("test_key")
        assert result == "test_value"
    
    @pytest.mark.asyncio
    async def test_cache_get_nonexistent(self):
        """Should return None for nonexistent key."""
        from utils.cache import SimpleCache
        
        cache = SimpleCache()
        result = await cache.get("nonexistent")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_cache_expiration(self):
        """Should expire after TTL."""
        from utils.cache import SimpleCache
        
        cache = SimpleCache(default_ttl=1)
        await cache.set("expire_key", "value", ttl=1)
        
        # Should exist immediately
        result = await cache.get("expire_key")
        assert result == "value"
        
        # Wait for expiration
        await asyncio.sleep(1.5)
        
        result = await cache.get("expire_key")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_cache_delete(self):
        """Should delete key."""
        from utils.cache import SimpleCache
        
        cache = SimpleCache()
        await cache.set("delete_key", "value")
        
        deleted = await cache.delete("delete_key")
        assert deleted is True
        
        result = await cache.get("delete_key")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_cache_clear(self):
        """Should clear all entries."""
        from utils.cache import SimpleCache
        
        cache = SimpleCache()
        await cache.set("key1", "value1")
        await cache.set("key2", "value2")
        
        await cache.clear()
        
        assert cache.size() == 0


class TestErrorClasses:
    """Tests for error handling utilities."""
    
    def test_auth_error_invalid_credentials(self):
        """Should create proper auth error."""
        from utils.errors import AuthError, ErrorCode
        
        error = AuthError.invalid_credentials()
        
        assert error.status_code == 401
        assert error.error_code == ErrorCode.AUTH_INVALID_CREDENTIALS
    
    def test_user_error_not_found(self):
        """Should create proper user error."""
        from utils.errors import UserError, ErrorCode
        
        error = UserError.not_found()
        
        assert error.status_code == 404
        assert error.error_code == ErrorCode.USER_NOT_FOUND
    
    def test_bestie_error_already_exists(self):
        """Should create proper bestie error."""
        from utils.errors import BestieError, ErrorCode
        
        error = BestieError.already_exists()
        
        assert error.status_code == 400
        assert error.error_code == ErrorCode.BESTIE_ALREADY_EXISTS


class TestResponses:
    """Tests for response utilities."""
    
    def test_success_response(self):
        """Should create success response."""
        from utils.responses import success_response
        
        response = success_response(data={"key": "value"}, message="OK")
        
        assert response.status_code == 200
    
    def test_error_response(self):
        """Should create error response."""
        from utils.responses import error_response
        
        response = error_response(message="Not found", status_code=404)
        
        assert response.status_code == 404


class TestDatabaseHelpers:
    """Tests for database helper functions."""
    
    def test_prepare_for_mongo_datetime(self):
        """Should convert datetime to ISO string."""
        from services.user_service import prepare_for_mongo
        
        data = {"created_at": datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)}
        result = prepare_for_mongo(data)
        
        assert isinstance(result["created_at"], str)
        assert "2025-01-01" in result["created_at"]
    
    def test_parse_from_mongo_datetime(self):
        """Should convert ISO string to datetime."""
        from services.user_service import parse_from_mongo
        
        data = {"created_at": "2025-01-01T12:00:00+00:00"}
        result = parse_from_mongo(data)
        
        assert isinstance(result["created_at"], datetime)
