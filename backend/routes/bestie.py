"""
Bestie routes.
"""
import logging
from fastapi import APIRouter, HTTPException
from emergentintegrations.llm.chat import LlmChat, UserMessage

from models.schemas import BestieCreate, BestieUpdate, MessageCreate
from services.user_service import UserService
from services.bestie_service import BestieService
from services.chat_service import ChatService
from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bestie", tags=["Bestie"])

# Will be set by main app
db = None


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


@router.post("/create")
async def create_bestie(user_id: str, bestie_data: BestieCreate):
    """Create a new bestie for a user."""
    user_service = UserService(db)
    bestie_service = BestieService(db)
    
    user_doc = await user_service.get_by_id(user_id)
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user already has a bestie
    existing_bestie = await bestie_service.get_by_user_id(user_id)
    if existing_bestie:
        raise HTTPException(status_code=400, detail="User already has a bestie")
    
    bestie_doc = await bestie_service.create(user_id, bestie_data.model_dump())
    return {"message": "Bestie created successfully", "bestie": bestie_doc}


@router.get("/{user_id}")
async def get_bestie(user_id: str):
    """Get bestie by user ID."""
    bestie_service = BestieService(db)
    bestie_doc = await bestie_service.get_by_user_id(user_id)
    
    if not bestie_doc:
        raise HTTPException(status_code=404, detail="Bestie not found")
    
    return bestie_doc


@router.put("/{bestie_id}")
async def update_bestie(bestie_id: str, update_data: BestieUpdate):
    """Update bestie."""
    bestie_service = BestieService(db)
    
    bestie_doc = await bestie_service.get_by_id(bestie_id)
    if not bestie_doc:
        raise HTTPException(status_code=404, detail="Bestie not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    updated_bestie = await bestie_service.update(bestie_id, update_dict)
    
    return {"message": "Bestie updated successfully", "bestie": updated_bestie}
