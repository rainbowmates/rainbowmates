"""
Date or Mate feature routes.
Helps users decide if someone is dating material or just friend material.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/date-or-mate", tags=["Date or Mate"])

# Will be set by main app
db = None


class StartSessionRequest(BaseModel):
    user_id: str
    bestie_name: str
    bestie_personality: List[str] = []


class ChatRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    message: str
    bestie_name: str
    bestie_personality: List[str] = []
    current_person: Optional[str] = None
    previous_people: List[str] = []
    is_continuation: bool = False


class PersonInfo(BaseModel):
    id: str
    name: str
    verdict: Optional[str] = None
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


@router.post("/start")
async def start_session(request: StartSessionRequest):
    """Start a new Date or Mate session."""
    session_id = str(uuid.uuid4())
    
    # Generate personalized greeting
    personality = ", ".join(request.bestie_personality) if request.bestie_personality else "fun and supportive"
    
    greetings = [
        f"Hey girl! 💕 So tell me, who are we talking about today? Is it someone new or someone we've discussed before? I'm ALL ears! 👀",
        f"Ooh, spill the tea! ☕ Who's caught your attention? New crush or an update on someone? Let's figure this out together! 💖",
        f"Hey babe! 💋 Ready to play Date or Mate? Tell me about this person - is it someone new or are we revisiting someone? 🔥"
    ]
    
    import random
    greeting = random.choice(greetings)
    
    # Store session in database
    if db is not None:
        await db.date_or_mate_sessions.insert_one({
            "session_id": session_id,
            "user_id": request.user_id,
            "bestie_name": request.bestie_name,
            "messages": [],
            "current_person": None,
            "created_at": datetime.now(timezone.utc)
        })
    
    return {
        "session_id": session_id,
        "greeting": greeting
    }


@router.post("/chat")
async def chat(request: ChatRequest):
    """Process a chat message and get bestie's response."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Build context about previous people
        previous_context = ""
        if request.previous_people:
            previous_context = f"Previously discussed people: {', '.join(request.previous_people)}. "
        
        current_context = ""
        if request.current_person:
            current_context = f"Currently discussing: {request.current_person}. "
        
        continuation_context = ""
        if request.is_continuation:
            continuation_context = "The user wants to continue discussing this person from a previous conversation. "
        
        # Build personality description
        personality_traits = ", ".join(request.bestie_personality) if request.bestie_personality else "fun, supportive, and honest"
        
        system_prompt = f"""You are {request.bestie_name}, a fabulous gay best friend helping your girl decide if someone is "Date" material or just "Mate" (friend) material.

Your personality: {personality_traits}

Your role:
1. Listen to her describe the person she's interested in
2. Ask thoughtful, probing questions to understand the situation better
3. Help her see both red flags and green flags
4. Be supportive but honest - if you see red flags, mention them kindly
5. Eventually help her reach a verdict: DATE (pursue romantically) or MATE (keep as friend)

Guidelines:
- Be conversational, warm, and use casual language with occasional emojis
- Ask ONE question at a time, don't overwhelm her
- Pick up on details she mentions and follow up on them
- If she mentions a name, remember it and use it
- If she's continuing a discussion about someone, acknowledge that
- Consider factors like: chemistry, values alignment, communication, effort they show, red flags, how they treat her
- When you have enough info (after several exchanges), offer your verdict with reasoning
- Keep responses concise (2-4 sentences usually)

{previous_context}{current_context}{continuation_context}"""

        chat_client = LlmChat(
            api_key=settings.EMERGENT_LLM_KEY,
            session_id=f"date_or_mate_{request.user_id}_{request.session_id or 'default'}",
            system_message=system_prompt
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        response = await chat_client.send_message(UserMessage(text=request.message))
        
        # Try to detect person's name from the conversation
        detected_person = None
        if not request.current_person:
            # Simple name detection - look for common patterns
            detected_person = await detect_person_name(request.user_id, request.message, response)
        
        # Check if a verdict was given
        verdict = None
        response_lower = response.lower()
        if "verdict:" in response_lower or "my verdict" in response_lower:
            if "date" in response_lower and "mate" not in response_lower.split("date")[0][-20:]:
                verdict = "Date"
            elif "mate" in response_lower:
                verdict = "Mate"
            
            # Update person's verdict in database
            if verdict and (request.current_person or detected_person):
                person_name = request.current_person or detected_person
                await update_person_verdict(request.user_id, person_name, verdict, response)
        
        # Store message in session
        if db is not None and request.session_id:
            await db.date_or_mate_sessions.update_one(
                {"session_id": request.session_id},
                {
                    "$push": {
                        "messages": {
                            "user": request.message,
                            "bestie": response,
                            "timestamp": datetime.now(timezone.utc)
                        }
                    },
                    "$set": {
                        "current_person": request.current_person or detected_person,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        
        return {
            "response": response,
            "detected_person": detected_person,
            "verdict": verdict
        }
        
    except Exception as e:
        logger.error(f"Date or Mate chat error: {str(e)}")
        # Return a fallback response
        fallbacks = [
            "Ooh tell me more about that! What happened next? 👀",
            "Interesting! And how did that make you feel? 💭",
            "Hmm, that's something to think about. What else can you tell me about them? 💕"
        ]
        import random
        return {
            "response": random.choice(fallbacks),
            "detected_person": None,
            "verdict": None
        }


async def detect_person_name(user_id: str, message: str, response: str) -> Optional[str]:
    """Try to detect a person's name from the message."""
    # Common patterns for introducing someone
    import re
    
    patterns = [
        r"his name is (\w+)",
        r"her name is (\w+)",
        r"their name is (\w+)",
        r"name'?s? (\w+)",
        r"called (\w+)",
        r"meet (\w+)",
        r"met (\w+)",
        r"talking to (\w+)",
        r"seeing (\w+)",
        r"dating (\w+)",
        r"about (\w+)[,.]",
    ]
    
    message_lower = message.lower()
    for pattern in patterns:
        match = re.search(pattern, message_lower)
        if match:
            name = match.group(1).capitalize()
            # Filter out common words that aren't names
            if name.lower() not in ['this', 'that', 'someone', 'anyone', 'him', 'her', 'them', 'guy', 'girl', 'person', 'about', 'more']:
                # Save this person to the database
                await save_person(user_id, name)
                return name
    
    return None


async def save_person(user_id: str, name: str):
    """Save a person to the user's history."""
    if db is None:
        return
    
    # Check if person already exists
    existing = await db.date_or_mate_people.find_one({
        "user_id": user_id,
        "name": {"$regex": f"^{name}$", "$options": "i"}
    })
    
    if not existing:
        await db.date_or_mate_people.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": name,
            "verdict": None,
            "summary": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })


async def update_person_verdict(user_id: str, name: str, verdict: str, summary: str):
    """Update a person's verdict."""
    if db is None:
        return
    
    # First ensure the person exists
    await save_person(user_id, name)
    
    # Update their verdict
    await db.date_or_mate_people.update_one(
        {"user_id": user_id, "name": {"$regex": f"^{name}$", "$options": "i"}},
        {
            "$set": {
                "verdict": verdict,
                "summary": summary[:500] if summary else None,  # Limit summary length
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )


@router.get("/people/{user_id}")
async def get_people(user_id: str):
    """Get all people the user has discussed."""
    if db is None:
        return {"people": []}
    
    cursor = db.date_or_mate_people.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("updated_at", -1)
    
    people = await cursor.to_list(length=50)
    return {"people": people}


@router.delete("/people/{user_id}/{person_id}")
async def delete_person(user_id: str, person_id: str):
    """Delete a person from the user's history."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    result = await db.date_or_mate_people.delete_one({
        "user_id": user_id,
        "id": person_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Person not found")
    
    return {"success": True}


@router.get("/history/{user_id}/{person_name}")
async def get_person_history(user_id: str, person_name: str):
    """Get conversation history about a specific person."""
    if db is None:
        return {"messages": []}
    
    # Find sessions that discussed this person
    cursor = db.date_or_mate_sessions.find(
        {
            "user_id": user_id,
            "current_person": {"$regex": f"^{person_name}$", "$options": "i"}
        },
        {"_id": 0, "messages": 1}
    ).sort("created_at", -1).limit(5)
    
    sessions = await cursor.to_list(length=5)
    
    # Flatten messages
    all_messages = []
    for session in sessions:
        all_messages.extend(session.get("messages", []))
    
    return {"messages": all_messages}
