"""
Chat routes.
"""
import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from models.schemas import MessageCreate
from services.user_service import UserService
from services.bestie_service import BestieService
from services.chat_service import ChatService
from utils.errors import UserError, BestieError, ChatError
from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])

# Will be set by main app
db = None


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


@router.post("/message")
async def send_message(user_id: str, message: MessageCreate):
    """Send a message to bestie and get response."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    user_service = UserService(db)
    bestie_service = BestieService(db)
    chat_service = ChatService(db)
    
    user_doc = await user_service.get_by_id(user_id)
    if not user_doc:
        raise UserError.not_found()
    
    bestie_doc = await bestie_service.get_by_id(message.bestie_id)
    if not bestie_doc:
        raise BestieError.not_found()
    
    user_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    await chat_service.add_message(
        user_id=user_id,
        bestie_id=message.bestie_id,
        role="user",
        content=message.content,
        message_id=user_msg_id
    )
    
    try:
        history = await chat_service.get_history(user_id, message.bestie_id, limit=20)
        system_prompt = bestie_service.build_system_prompt(bestie_doc, user_doc)
        
        chat = LlmChat(
            api_key=settings.EMERGENT_LLM_KEY,
            system_prompt=system_prompt
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        for msg in history[:-1]:
            if msg["role"] == "user":
                await chat.send_message(UserMessage(text=msg["content"]))
        
        response = await chat.send_message(UserMessage(text=message.content))
        bestie_response = response.get("content", "I'm here for you, sweetie!")
        
        bestie_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        await chat_service.add_message(
            user_id=user_id,
            bestie_id=message.bestie_id,
            role="bestie",
            content=bestie_response,
            message_id=bestie_msg_id
        )
        
        return {
            "user_message": {"id": user_msg_id, "content": message.content, "role": "user"},
            "bestie_response": {"id": bestie_msg_id, "content": bestie_response, "role": "bestie"}
        }
        
    except Exception as e:
        logger.error(f"Error generating response: {e}")
        raise ChatError.generation_failed()


@router.get("/history/{user_id}/{bestie_id}")
async def get_chat_history(user_id: str, bestie_id: str, limit: int = 50):
    """Get chat history."""
    chat_service = ChatService(db)
    messages = await chat_service.get_history(user_id, bestie_id, limit=limit)
    return {"messages": messages}


@router.delete("/history/{user_id}/{bestie_id}")
async def clear_chat_history(user_id: str, bestie_id: str):
    """Clear all chat history."""
    chat_service = ChatService(db)
    count = await chat_service.clear_history(user_id, bestie_id)
    return {"message": f"Cleared {count} messages"}


@router.delete("/message/{user_id}/{bestie_id}/{message_id}")
async def delete_message(user_id: str, bestie_id: str, message_id: str):
    """Delete a specific message."""
    chat_service = ChatService(db)
    deleted = await chat_service.delete_message(user_id, bestie_id, message_id)
    
    if not deleted:
        raise ChatError.message_not_found()
    
    return {"message": "Message deleted"}
