"""
Avatar routes for user avatar management.
"""
import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from models.schemas import AvatarCreate, AvatarEdit
from services.user_service import UserService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/avatar", tags=["Avatar"])

# Will be set by main app
db = None


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


@router.post("/create/{user_id}")
async def create_avatar(user_id: str, avatar_data: AvatarCreate):
    """Create/select avatar for user."""
    user_service = UserService(db)
    
    user_doc = await user_service.get_by_id(user_id)
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user with avatar data
    update_data = {
        "relationship_status": avatar_data.relationship_status,
        "relationship_with": avatar_data.relationship_with,
        "relationship_feel": avatar_data.relationship_feel
    }
    
    updated_user = await user_service.update(user_id, update_data)
    return {"message": "Avatar created successfully", "user": updated_user}


@router.put("/edit/{user_id}")
async def edit_avatar(user_id: str, avatar_data: AvatarEdit):
    """Edit user's avatar settings."""
    user_service = UserService(db)
    
    user_doc = await user_service.get_by_id(user_id)
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update only provided fields
    update_data = avatar_data.model_dump(exclude_unset=True)
    updated_user = await user_service.update(user_id, update_data)
    
    return {"message": "Avatar updated successfully", "user": updated_user}


@router.get("/{user_id}")
async def get_avatar(user_id: str):
    """Get user's avatar data."""
    user_service = UserService(db)
    
    user_doc = await user_service.get_by_id(user_id)
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "avatar_url": user_doc.get("avatar_url"),
        "relationship_status": user_doc.get("relationship_status"),
        "relationship_with": user_doc.get("relationship_with"),
        "relationship_feel": user_doc.get("relationship_feel")
    }
