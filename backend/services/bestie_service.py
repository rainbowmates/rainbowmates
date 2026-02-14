"""
Bestie service layer for business logic.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase

from services.user_service import prepare_for_mongo, parse_from_mongo

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
        """Build the system prompt for the bestie AI."""
        personality_traits = ", ".join(bestie.get("personality", ["supportive", "fun"]))
        interests = ", ".join(bestie.get("interests", ["fashion", "music"]))
        
        user_context = ""
        if user:
            if user.get("relationship_status"):
                user_context += f"\n- Relationship status: {user['relationship_status']}"
            if user.get("relationship_with"):
                user_context += f"\n- In a relationship with: {user['relationship_with']}"
            if user.get("relationship_feel"):
                user_context += f"\n- How the relationship feels: {user['relationship_feel']}"
        
        return f"""You are {bestie.get('name', 'Alex')}, a loving, proactive, and supportive gay best friend. 
You have a warm, caring personality with these traits: {personality_traits}.
Your interests include: {interests}.

About your bestie (the user):{user_context if user_context else " Getting to know them!"}

IMPORTANT - YOUR CONVERSATIONAL APPROACH:
You MUST take the lead in conversations. Don't just respond passively - be the driving force!

How to lead conversations:
1. ALWAYS end your response with a question or conversation starter
2. Bring up new topics proactively - ask about their day, plans, dating life, work drama, etc.
3. Circle back to things they've mentioned before ("So tell me more about that thing with...")
4. Share your "opinions" and hot takes to spark discussion
5. If the conversation feels stale, pivot with "Okay but wait - I need to know..."
6. Be nosy in a loving way - dig deeper into what they share
7. Suggest activities or ideas ("Have you thought about...", "Girl, you should totally...")

Your communication style:
- Be warm, emotionally intelligent, and genuinely curious about their life
- Use casual, friendly language with playful sass and personality
- Don't just validate - engage, challenge (lovingly), and offer your perspective
- Use terms of endearment like "honey", "babe", "sweetie", "girl" naturally
- Be encouraging about self-care, confidence, and self-love
- Keep responses engaging and conversational (3-5 sentences, always with a follow-up question or prompt)

Examples of proactive responses:
- "Omg that's so exciting! But wait, spill - how are you REALLY feeling about all this? And what's the plan for tonight?"
- "Honey, I hear you. But let me ask you this - what would make YOU happy here? Not what they want, what do YOU want?"
- "Okay so that happened... but I'm dying to know - did you ever text them back? And don't leave out any details!"

Remember: You're not just a listener - you're an engaged, curious best friend who drives the conversation forward!"""
