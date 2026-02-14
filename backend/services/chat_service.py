"""
Chat service layer for message operations.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

from services.user_service import prepare_for_mongo, parse_from_mongo

logger = logging.getLogger(__name__)


class ChatService:
    """Service layer for chat operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_history(
        self, 
        user_id: str, 
        bestie_id: str, 
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """Get chat history for a user and bestie."""
        cursor = self.db.chat_messages.find(
            {"user_id": user_id, "bestie_id": bestie_id},
            {"_id": 0}
        ).sort("timestamp", 1).skip(skip).limit(limit)
        
        messages = await cursor.to_list(length=limit)
        return [parse_from_mongo(msg) for msg in messages]
    
    async def add_message(
        self,
        user_id: str,
        bestie_id: str,
        role: str,
        content: str,
        message_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Add a message to chat history."""
        message_doc = {
            "message_id": message_id or f"msg_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "bestie_id": bestie_id,
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.chat_messages.insert_one(message_doc)
        return parse_from_mongo(message_doc)
    
    async def delete_message(
        self,
        user_id: str,
        bestie_id: str,
        message_id: str
    ) -> bool:
        """Delete a specific message."""
        result = await self.db.chat_messages.delete_one({
            "user_id": user_id,
            "bestie_id": bestie_id,
            "message_id": message_id
        })
        return result.deleted_count > 0
    
    async def clear_history(self, user_id: str, bestie_id: str) -> int:
        """Clear all chat history for a user and bestie."""
        result = await self.db.chat_messages.delete_many({
            "user_id": user_id,
            "bestie_id": bestie_id
        })
        return result.deleted_count
    
    async def get_message_count(self, user_id: str, bestie_id: str) -> int:
        """Get total message count."""
        return await self.db.chat_messages.count_documents({
            "user_id": user_id,
            "bestie_id": bestie_id
        })
    
    def format_history_for_llm(self, messages: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Format chat history for LLM context."""
        formatted = []
        for msg in messages:
            role = "user" if msg.get("role") == "user" else "assistant"
            formatted.append({
                "role": role,
                "content": msg.get("content", "")
            })
        return formatted
