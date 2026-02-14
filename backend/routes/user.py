"""
User routes.
"""
import logging
from fastapi import APIRouter, HTTPException

from models.schemas import UserUpdate
from services.user_service import UserService
from utils.errors import UserError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["Users"])

# Will be set by main app
db = None


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


@router.get("/{user_id}")
async def get_user(user_id: str):
    """Get user by ID."""
    user_service = UserService(db)
    user_doc = await user_service.get_by_id(user_id)
    
    if not user_doc:
        raise UserError.not_found()
    
    return user_doc


@router.put("/update/{user_id}")
async def update_user(user_id: str, update_data: UserUpdate):
    """Update user profile."""
    user_service = UserService(db)
    
    user_doc = await user_service.get_by_id(user_id)
    if not user_doc:
        raise UserError.not_found()
    
    update_dict = update_data.model_dump(exclude_unset=True)
    updated_user = await user_service.update(user_id, update_dict)
    
    return {"message": "User updated successfully", "user": updated_user}


@router.delete("/delete/{user_id}")
async def delete_user(user_id: str):
    """Delete user account."""
    user_service = UserService(db)
    await user_service.delete(user_id)
    return {"message": "Account deleted successfully"}
