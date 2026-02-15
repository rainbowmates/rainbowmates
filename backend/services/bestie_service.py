"""
Bestie service layer for business logic.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

from services.user_service import prepare_for_mongo, parse_from_mongo
from utils.prompts import get_bestie_system_prompt

logger = logging.getLogger(__name__)


class BestieService:
    """Service layer for bestie operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_by_id(self, bestie_id: str) -> Optional[Dict[str, Any]]:
        """Get bestie by ID."""
        bestie_doc = await self.db.besties.find_one({"id": bestie_id}, {"_id": 0})
        if bestie_doc:
            return parse_from_mongo(bestie_doc)
        return None
    
    async def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get bestie by user ID."""
        bestie_doc = await self.db.besties.find_one({"user_id": user_id}, {"_id": 0})
        if bestie_doc:
            return parse_from_mongo(bestie_doc)
        return None
    
    async def create(self, user_id: str, bestie_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new bestie."""
        bestie_id = f"bestie_{uuid.uuid4().hex[:12]}"
        
        bestie_doc = {
            "id": bestie_id,
            "user_id": user_id,
            "name": bestie_data.get("name"),
            "image_url": bestie_data.get("image_url"),
            "personality": bestie_data.get("personality", []),
            "interests": bestie_data.get("interests", []),
            "accent": bestie_data.get("accent", "British"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.besties.insert_one(bestie_doc)
        
        # Update user with bestie_id
        await self.db.users.update_one(
            {"id": user_id},
            {"$set": {"bestie_id": bestie_id}}
        )
        
        return parse_from_mongo(bestie_doc)
    
    async def update(self, bestie_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update bestie data."""
        update_data = {k: v for k, v in update_data.items() if v is not None}
        if not update_data:
            return await self.get_by_id(bestie_id)
        
        await self.db.besties.update_one(
            {"id": bestie_id},
            {"$set": prepare_for_mongo(update_data)}
        )
        return await self.get_by_id(bestie_id)
    
    async def delete(self, bestie_id: str) -> bool:
        """Delete bestie."""
        result = await self.db.besties.delete_one({"id": bestie_id})
        return result.deleted_count > 0
    
    def build_system_prompt(self, bestie: Dict[str, Any], user: Optional[Dict[str, Any]] = None) -> str:
        """Build the system prompt for the bestie AI using shared utility."""
        # Build user context if available
        user_context = None
        if user:
            context_parts = []
            if user.get("relationship_status"):
                context_parts.append(f"Relationship: {user['relationship_status']}")
            if user.get("name") or user.get("first_name"):
                context_parts.append(f"Name: {user.get('name') or user.get('first_name')}")
            if context_parts:
                user_context = " ".join(context_parts)
        
        return get_bestie_system_prompt(
            bestie_name=bestie.get('name', 'Alex'),
            personality=bestie.get('personality', ['supportive', 'fun']),
            interests=bestie.get('interests', ['fashion', 'gossip']),
            user_context=user_context
        )
