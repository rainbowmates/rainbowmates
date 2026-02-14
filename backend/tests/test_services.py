"""
Tests for service layer.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock


class TestUserService:
    """Tests for UserService."""
    
    @pytest.mark.asyncio
    async def test_get_by_id_found(self, mock_db, sample_user):
        """Should return user when found."""
        from services.user_service import UserService
        
        mock_db.users.find_one = AsyncMock(return_value=sample_user)
        service = UserService(mock_db)
        
        result = await service.get_by_id("user_test123")
        
        assert result is not None
        assert result["id"] == "user_test123"
    
    @pytest.mark.asyncio
    async def test_get_by_id_not_found(self, mock_db):
        """Should return None when user not found."""
        from services.user_service import UserService
        
        mock_db.users.find_one = AsyncMock(return_value=None)
        service = UserService(mock_db)
        
        result = await service.get_by_id("nonexistent")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_email_exists_true(self, mock_db):
        """Should return True when email exists."""
        from services.user_service import UserService
        
        mock_db.users.find_one = AsyncMock(return_value={"_id": "123"})
        service = UserService(mock_db)
        
        result = await service.email_exists("test@example.com")
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_email_exists_false(self, mock_db):
        """Should return False when email doesn't exist."""
        from services.user_service import UserService
        
        mock_db.users.find_one = AsyncMock(return_value=None)
        service = UserService(mock_db)
        
        result = await service.email_exists("new@example.com")
        
        assert result is False


class TestBestieService:
    """Tests for BestieService."""
    
    @pytest.mark.asyncio
    async def test_get_by_user_id(self, mock_db, sample_bestie):
        """Should return bestie for user."""
        from services.bestie_service import BestieService
        
        mock_db.besties.find_one = AsyncMock(return_value=sample_bestie)
        service = BestieService(mock_db)
        
        result = await service.get_by_user_id("user_test123")
        
        assert result is not None
        assert result["name"] == "Alex"
    
    def test_build_system_prompt(self, mock_db, sample_bestie, sample_user):
        """Should build valid system prompt."""
        from services.bestie_service import BestieService
        
        service = BestieService(mock_db)
        prompt = service.build_system_prompt(sample_bestie, sample_user)
        
        assert "Alex" in prompt
        assert "supportive" in prompt.lower() or "fun" in prompt.lower()


class TestChatService:
    """Tests for ChatService."""
    
    @pytest.mark.asyncio
    async def test_get_history(self, mock_db, sample_message):
        """Should return chat history."""
        from services.chat_service import ChatService
        
        mock_cursor = MagicMock()
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_cursor.skip = MagicMock(return_value=mock_cursor)
        mock_cursor.limit = MagicMock(return_value=mock_cursor)
        mock_cursor.to_list = AsyncMock(return_value=[sample_message])
        mock_db.chat_messages.find = MagicMock(return_value=mock_cursor)
        
        service = ChatService(mock_db)
        result = await service.get_history("user_test123", "bestie_test123")
        
        assert len(result) == 1
        assert result[0]["content"] == "Hello bestie!"
    
    @pytest.mark.asyncio
    async def test_add_message(self, mock_db):
        """Should add message to history."""
        from services.chat_service import ChatService
        
        mock_db.chat_messages.insert_one = AsyncMock()
        service = ChatService(mock_db)
        
        result = await service.add_message(
            user_id="user_test123",
            bestie_id="bestie_test123",
            role="user",
            content="Test message"
        )
        
        assert result["content"] == "Test message"
        assert result["role"] == "user"
        mock_db.chat_messages.insert_one.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_delete_message(self, mock_db):
        """Should delete message."""
        from services.chat_service import ChatService
        
        mock_result = MagicMock()
        mock_result.deleted_count = 1
        mock_db.chat_messages.delete_one = AsyncMock(return_value=mock_result)
        
        service = ChatService(mock_db)
        result = await service.delete_message("user_test123", "bestie_test123", "msg_123")
        
        assert result is True
