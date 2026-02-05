"""
User service layer for business logic.
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.schemas import User, UserCreate
from utils.password import verify_password

logger = logging.getLogger(__name__)


def prepare_for_mongo(data: dict) -> dict:
    """Convert datetime objects to ISO strings for MongoDB"""
    doc = data.copy()
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


def parse_from_mongo(data: dict) -> dict:
    """Convert ISO strings back to datetime objects"""
    doc = data.copy()
    for key, value in doc.items():
        if key in ['created_at', 'timestamp', 'start_date', 'end_date'] and isinstance(value, str):
            try:
                doc[key] = datetime.fromisoformat(value)
            except:
                pass
    return doc


class UserService:
    """Service layer for user operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        user_doc = await self.db.users.find_one({"id": user_id}, {"_id": 0})
        if user_doc:
            return parse_from_mongo(user_doc)
        return None
    
    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        user_doc = await self.db.users.find_one({"email": email.lower()}, {"_id": 0})
        if user_doc:
            return parse_from_mongo(user_doc)
        return None
    
    async def get_by_mobile(self, mobile: str) -> Optional[Dict[str, Any]]:
        """Get user by mobile."""
        user_doc = await self.db.users.find_one({"mobile": mobile}, {"_id": 0})
        if user_doc:
            return parse_from_mongo(user_doc)
        return None
    
    async def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Get user by email or mobile."""
        user_doc = await self.db.users.find_one(
            {"$or": [{"email": identifier.lower()}, {"mobile": identifier}]},
            {"_id": 0}
        )
        if user_doc:
            return parse_from_mongo(user_doc)
        return None
    
    async def create(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user."""
        user_doc = prepare_for_mongo(user_data)
        await self.db.users.insert_one(user_doc)
        return parse_from_mongo(user_doc)
    
    async def update(self, user_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user data."""
        update_data = {k: v for k, v in update_data.items() if v is not None}
        if not update_data:
            return await self.get_by_id(user_id)
        
        await self.db.users.update_one(
            {"id": user_id},
            {"$set": prepare_for_mongo(update_data)}
        )
        return await self.get_by_id(user_id)
    
    async def verify(self, identifier: str) -> bool:
        """Mark user as verified."""
        result = await self.db.users.update_one(
            {"$or": [{"email": identifier.lower()}, {"mobile": identifier}]},
            {"$set": {"is_verified": True}}
        )
        return result.modified_count > 0
    
    async def update_password(self, email: str, new_password: str) -> bool:
        """Update user password."""
        result = await self.db.users.update_one(
            {"email": email.lower()},
            {"$set": {"password": new_password}}
        )
        return result.modified_count > 0
    
    async def delete(self, user_id: str) -> bool:
        """Delete user and related data."""
        await self.db.users.delete_one({"id": user_id})
        await self.db.besties.delete_many({"user_id": user_id})
        await self.db.messages.delete_many({"user_id": user_id})
        await self.db.chat_messages.delete_many({"user_id": user_id})
        await self.db.subscriptions.delete_many({"user_id": user_id})
        return True
    
    async def email_exists(self, email: str) -> bool:
        """Check if email already exists."""
        user = await self.db.users.find_one({"email": email.lower()}, {"_id": 1})
        return user is not None
    
    async def mobile_exists(self, mobile: str) -> bool:
        """Check if mobile already exists."""
        user = await self.db.users.find_one({"mobile": mobile}, {"_id": 1})
        return user is not None
    
    async def validate_credentials(self, identifier: str, password: str) -> Optional[Dict[str, Any]]:
        """Validate user credentials with hashed password."""
        user_doc = await self.db.users.find_one({
            "$or": [{"email": identifier.lower()}, {"mobile": identifier}]
        }, {"_id": 0})
        
        if not user_doc:
            return None
        
        # Check password - support both hashed and plain text (for migration)
        stored_password = user_doc.get("password", "")
        if stored_password.startswith("$2"):
            # Bcrypt hash
            if not verify_password(password, stored_password):
                return None
        else:
            # Plain text (legacy) - direct comparison
            if stored_password != password:
                return None
        
        return parse_from_mongo(user_doc)
