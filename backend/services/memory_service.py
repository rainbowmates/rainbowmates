"""
Memory Compression Service for Bestie AI.
Handles rolling memory summarization and emotional vector compression.
NO full chat history passed to LLM - only compressed summaries.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class MemoryService:
    """
    Service for managing compressed conversation memory.
    Instead of sending full chat history, we maintain:
    - Rolling summary of conversation themes
    - Emotional trend vector
    - Key facts about the user
    - Recent conversation context (last 3-5 exchanges only)
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.conversation_memory
    
    async def get_memory_context(self, user_id: str, bestie_id: str) -> Dict[str, Any]:
        """
        Get compressed memory context for LLM injection.
        Returns summary + emotional vector, NOT full history.
        """
        doc = await self.collection.find_one(
            {"user_id": user_id, "bestie_id": bestie_id},
            {"_id": 0}
        )
        
        if not doc:
            return self._get_default_memory()
        
        return {
            "rolling_summary": doc.get("rolling_summary", ""),
            "emotional_trend": doc.get("emotional_trend", "neutral"),
            "key_facts": doc.get("key_facts", []),
            "recent_topics": doc.get("recent_topics", []),
            "last_mood_sequence": doc.get("last_mood_sequence", []),
            "relationship_milestones": doc.get("relationship_milestones", []),
        }
    
    def _get_default_memory(self) -> Dict[str, Any]:
        """Default memory for new conversations."""
        return {
            "rolling_summary": "This is a new friendship. Getting to know each other.",
            "emotional_trend": "neutral",
            "key_facts": [],
            "recent_topics": [],
            "last_mood_sequence": [],
            "relationship_milestones": [],
        }
    
    async def update_memory(
        self, 
        user_id: str, 
        bestie_id: str,
        user_message: str,
        bestie_response: str,
        detected_mood: str,
        topics: Optional[List[str]] = None
    ):
        """
        Update memory with new conversation exchange.
        Compresses information rather than storing full messages.
        """
        now = datetime.now(timezone.utc)
        
        # Get current memory
        current = await self.get_memory_context(user_id, bestie_id)
        
        # Update mood sequence (keep last 10)
        mood_sequence = current.get("last_mood_sequence", [])
        mood_sequence.append({
            "mood": detected_mood,
            "timestamp": now.isoformat()
        })
        if len(mood_sequence) > 10:
            mood_sequence = mood_sequence[-10:]
        
        # Calculate emotional trend from mood sequence
        emotional_trend = self._calculate_emotional_trend(mood_sequence)
        
        # Update recent topics (keep last 5)
        recent_topics = current.get("recent_topics", [])
        if topics:
            for topic in topics:
                if topic not in recent_topics:
                    recent_topics.append(topic)
            if len(recent_topics) > 5:
                recent_topics = recent_topics[-5:]
        
        # Extract key facts from message (simple extraction)
        new_facts = self._extract_key_facts(user_message)
        key_facts = current.get("key_facts", [])
        for fact in new_facts:
            if fact not in key_facts:
                key_facts.append(fact)
        if len(key_facts) > 15:
            key_facts = key_facts[-15:]  # Keep most recent
        
        # Update rolling summary (append new context)
        rolling_summary = self._update_rolling_summary(
            current.get("rolling_summary", ""),
            user_message,
            bestie_response,
            detected_mood
        )
        
        # Upsert memory document
        await self.collection.update_one(
            {"user_id": user_id, "bestie_id": bestie_id},
            {
                "$set": {
                    "rolling_summary": rolling_summary,
                    "emotional_trend": emotional_trend,
                    "key_facts": key_facts,
                    "recent_topics": recent_topics,
                    "last_mood_sequence": mood_sequence,
                    "last_updated": now.isoformat()
                },
                "$setOnInsert": {
                    "created_at": now.isoformat()
                }
            },
            upsert=True
        )
    
    def _calculate_emotional_trend(self, mood_sequence: List[Dict]) -> str:
        """Calculate overall emotional trend from recent moods."""
        if not mood_sequence:
            return "neutral"
        
        recent_moods = [m["mood"] for m in mood_sequence[-5:]]
        
        # Count mood categories
        positive = sum(1 for m in recent_moods if m in ["happy", "excited", "calm"])
        negative = sum(1 for m in recent_moods if m in ["sad", "anxious", "stressed", "angry"])
        
        if positive > negative + 1:
            return "positive"
        elif negative > positive + 1:
            return "needs_support"
        else:
            return "neutral"
    
    def _extract_key_facts(self, message: str) -> List[str]:
        """
        Extract potential key facts from user message.
        Simple pattern-based extraction.
        """
        facts = []
        message_lower = message.lower()
        
        # Work/job related
        if any(word in message_lower for word in ["my job", "at work", "my boss", "coworker", "office"]):
            # Could extract more specific info with NLP
            pass
        
        # Relationship mentions
        if any(word in message_lower for word in ["my boyfriend", "my girlfriend", "partner", "husband", "wife", "dating"]):
            # Store that user has a partner
            if "my boyfriend" in message_lower or "my husband" in message_lower:
                facts.append("Has boyfriend/husband")
            elif "my girlfriend" in message_lower or "my wife" in message_lower:
                facts.append("Has girlfriend/wife")
            elif "dating" in message_lower:
                facts.append("Currently dating someone")
        
        # Family mentions
        if "my mom" in message_lower or "my mother" in message_lower:
            facts.append("Has mentioned mother")
        if "my dad" in message_lower or "my father" in message_lower:
            facts.append("Has mentioned father")
        
        # Pet mentions
        if any(word in message_lower for word in ["my dog", "my cat", "my pet"]):
            if "my dog" in message_lower:
                facts.append("Has a dog")
            elif "my cat" in message_lower:
                facts.append("Has a cat")
        
        return facts
    
    def _update_rolling_summary(
        self, 
        current_summary: str, 
        user_message: str,
        bestie_response: str,
        mood: str
    ) -> str:
        """
        Update rolling summary with new exchange context.
        Keeps summary concise (under 500 chars).
        """
        # Simple append with truncation
        # In production, could use LLM to generate better summaries
        
        # Extract key point from exchange (simplified)
        exchange_summary = ""
        message_lower = user_message.lower()
        
        if mood in ["sad", "anxious"]:
            exchange_summary = f"User was feeling {mood}. "
        elif mood in ["happy", "excited"]:
            exchange_summary = "User shared positive news. "
        elif any(word in message_lower for word in ["help", "advice", "should i"]):
            exchange_summary = "User asked for advice. "
        
        # Combine with existing summary
        new_summary = current_summary
        if exchange_summary:
            new_summary = f"{current_summary} {exchange_summary}".strip()
        
        # Truncate if too long
        if len(new_summary) > 500:
            # Keep the most recent part
            new_summary = "..." + new_summary[-450:]
        
        return new_summary
    
    def build_context_for_llm(self, memory: Dict[str, Any]) -> str:
        """
        Build a compressed context string for LLM system prompt.
        """
        parts = []
        
        if memory.get("rolling_summary"):
            parts.append(f"Conversation history: {memory['rolling_summary']}")
        
        if memory.get("emotional_trend") and memory["emotional_trend"] != "neutral":
            parts.append(f"User's recent emotional trend: {memory['emotional_trend']}")
        
        if memory.get("key_facts"):
            facts_str = ", ".join(memory["key_facts"][:5])
            parts.append(f"Things you know about them: {facts_str}")
        
        if memory.get("recent_topics"):
            topics_str = ", ".join(memory["recent_topics"])
            parts.append(f"Recent topics discussed: {topics_str}")
        
        return " | ".join(parts) if parts else "This is a new conversation."


# Singleton instance
_memory_service: Optional[MemoryService] = None

def get_memory_service(db: AsyncIOMotorDatabase) -> MemoryService:
    """Get or create the memory service instance."""
    global _memory_service
    if _memory_service is None:
        _memory_service = MemoryService(db)
    return _memory_service
