"""
Relationship Scoring Engine for Bestie AI.
Dynamically tracks and evolves emotional relationship values.
"""
import logging
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


# Default starting values for new relationships
DEFAULT_SCORES = {
    "warmth_score": 0.3,      # Starts cool, warms up over time
    "trust_score": 0.2,       # Trust is earned slowly
    "playfulness_score": 0.5, # Mid-level sass from start
    "attachment_score": 0.1,  # Attachment grows with consistency
}

# Score evolution rules
SCORE_BOUNDS = {"min": 0.0, "max": 1.0}

# Keywords/patterns for mood detection
MOOD_INDICATORS = {
    "happy": ["happy", "excited", "great", "amazing", "awesome", "love", "yay", "woohoo", "best", "perfect", "wonderful"],
    "sad": ["sad", "depressed", "down", "upset", "crying", "tears", "heartbroken", "lonely", "miss", "lost"],
    "anxious": ["anxious", "worried", "nervous", "stressed", "panic", "scared", "afraid", "overwhelmed", "can't sleep"],
    "excited": ["excited", "can't wait", "omg", "amazing", "finally", "yes!", "wooo", "pumped", "thrilled"],
    "angry": ["angry", "furious", "mad", "pissed", "hate", "annoyed", "frustrated", "ugh", "sick of"],
    "calm": ["calm", "peaceful", "relaxed", "chill", "content", "okay", "fine", "good"],
    "stressed": ["stressed", "overwhelmed", "too much", "deadline", "pressure", "exhausted", "burned out"],
}

# Conversation patterns that affect scores
POSITIVE_PATTERNS = ["thank", "love you", "you're the best", "missed you", "so glad", "appreciate", "helped me"]
VULNERABILITY_PATTERNS = ["never told anyone", "between us", "secret", "trust you", "only you", "confess", "admit"]
PLAYFUL_PATTERNS = ["lol", "haha", "😂", "🤣", "joke", "tease", "roast", "slay", "iconic", "tea"]
RETURNING_PATTERNS = ["back", "hey again", "missed", "been a while", "sorry i was gone"]


class RelationshipEngine:
    """
    Engine for tracking and evolving emotional relationship scores.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.relationship_scores
    
    async def get_scores(self, user_id: str, bestie_id: str) -> Dict[str, Any]:
        """
        Get current relationship scores for a user-bestie pair.
        Creates default scores if none exist.
        """
        doc = await self.collection.find_one(
            {"user_id": user_id, "bestie_id": bestie_id},
            {"_id": 0}
        )
        
        if not doc:
            # Create new relationship record
            doc = await self._create_default_scores(user_id, bestie_id)
        
        return doc
    
    async def _create_default_scores(self, user_id: str, bestie_id: str) -> Dict[str, Any]:
        """Create default scores for a new relationship."""
        now = datetime.now(timezone.utc)
        doc = {
            "user_id": user_id,
            "bestie_id": bestie_id,
            **DEFAULT_SCORES,
            "bestie_mood": "friendly",
            "last_user_mood": "neutral",
            "conversation_count": 0,
            "total_messages": 0,
            "streak_days": 0,
            "last_interaction": now.isoformat(),
            "created_at": now.isoformat(),
            "mood_history": [],
            "score_history": []
        }
        await self.collection.insert_one(doc)
        return {k: v for k, v in doc.items() if k != "_id"}
    
    def detect_mood(self, message: str) -> str:
        """
        Detect mood from message content using keyword analysis.
        Returns the most likely mood.
        """
        message_lower = message.lower()
        mood_scores = {}
        
        for mood, indicators in MOOD_INDICATORS.items():
            score = sum(1 for word in indicators if word in message_lower)
            if score > 0:
                mood_scores[mood] = score
        
        if not mood_scores:
            return "neutral"
        
        return max(mood_scores, key=mood_scores.get)
    
    def _calculate_score_deltas(
        self, 
        message: str, 
        current_scores: Dict[str, float],
        detected_mood: str,
        time_since_last: float  # hours
    ) -> Dict[str, float]:
        """
        Calculate how much each score should change based on the message.
        Returns deltas (can be positive or negative).
        """
        message_lower = message.lower()
        deltas = {
            "warmth_score": 0.0,
            "trust_score": 0.0,
            "playfulness_score": 0.0,
            "attachment_score": 0.0,
        }
        
        # Base interaction bonus (just talking increases warmth slightly)
        deltas["warmth_score"] += 0.01
        
        # Positive patterns increase warmth
        for pattern in POSITIVE_PATTERNS:
            if pattern in message_lower:
                deltas["warmth_score"] += 0.03
                deltas["attachment_score"] += 0.02
        
        # Vulnerability increases trust significantly
        for pattern in VULNERABILITY_PATTERNS:
            if pattern in message_lower:
                deltas["trust_score"] += 0.05
                deltas["warmth_score"] += 0.02
        
        # Playful patterns increase playfulness
        for pattern in PLAYFUL_PATTERNS:
            if pattern in message_lower:
                deltas["playfulness_score"] += 0.02
        
        # Returning after absence shows attachment
        for pattern in RETURNING_PATTERNS:
            if pattern in message_lower:
                deltas["attachment_score"] += 0.03
        
        # Long messages suggest engagement
        if len(message) > 100:
            deltas["trust_score"] += 0.01
            deltas["warmth_score"] += 0.01
        
        # Mood-based adjustments
        if detected_mood in ["happy", "excited"]:
            deltas["warmth_score"] += 0.02
            deltas["playfulness_score"] += 0.01
        elif detected_mood in ["sad", "anxious", "stressed"]:
            # Opening up about negative feelings builds trust
            deltas["trust_score"] += 0.02
        
        # Time-based adjustments
        if time_since_last > 48:  # Been away for 2+ days
            # Slight decay for absence
            deltas["warmth_score"] -= 0.02
            deltas["attachment_score"] -= 0.01
        elif time_since_last < 1:  # Very frequent chatting
            deltas["attachment_score"] += 0.01
        
        # Streak bonus (consistent daily chatting)
        # This is handled separately in update_scores
        
        return deltas
    
    def _determine_bestie_mood(
        self, 
        user_mood: str, 
        scores: Dict[str, float]
    ) -> str:
        """
        Determine bestie's mood based on user mood and relationship scores.
        """
        playfulness = scores.get("playfulness_score", 0.5)
        warmth = scores.get("warmth_score", 0.5)
        attachment = scores.get("attachment_score", 0.3)
        
        # If user is sad/anxious, bestie becomes comforting
        if user_mood in ["sad", "anxious", "stressed"]:
            if warmth > 0.6:
                return "comforting"
            return "supportive"
        
        # If user is happy/excited, bestie matches energy
        if user_mood in ["happy", "excited"]:
            if playfulness > 0.6:
                return "excited"
            return "playful"
        
        # If user is angry, bestie becomes protective
        if user_mood == "angry":
            if attachment > 0.5:
                return "protective"
            return "curious"
        
        # Default moods based on relationship strength
        if playfulness > 0.7:
            return "sassy"
        if warmth > 0.7:
            return "warm"
        if attachment > 0.6:
            return "affectionate"
        
        return "friendly"
    
    async def update_scores(
        self, 
        user_id: str, 
        bestie_id: str, 
        message: str
    ) -> Dict[str, Any]:
        """
        Update relationship scores based on a new message.
        Returns updated scores and detected mood.
        """
        # Get current scores
        current = await self.get_scores(user_id, bestie_id)
        
        # Detect user mood
        detected_mood = self.detect_mood(message)
        
        # Calculate time since last interaction
        last_interaction = current.get("last_interaction")
        if last_interaction:
            if isinstance(last_interaction, str):
                last_time = datetime.fromisoformat(last_interaction.replace('Z', '+00:00'))
            else:
                last_time = last_interaction
            time_delta = datetime.now(timezone.utc) - last_time
            hours_since = time_delta.total_seconds() / 3600
        else:
            hours_since = 0
        
        # Calculate deltas
        current_scores = {
            "warmth_score": current.get("warmth_score", 0.5),
            "trust_score": current.get("trust_score", 0.4),
            "playfulness_score": current.get("playfulness_score", 0.6),
            "attachment_score": current.get("attachment_score", 0.3),
        }
        
        deltas = self._calculate_score_deltas(
            message, current_scores, detected_mood, hours_since
        )
        
        # Apply deltas with bounds
        new_scores = {}
        for key, current_val in current_scores.items():
            new_val = current_val + deltas[key]
            new_val = max(SCORE_BOUNDS["min"], min(SCORE_BOUNDS["max"], new_val))
            new_scores[key] = round(new_val, 3)
        
        # Update streak
        streak_days = current.get("streak_days", 0)
        if hours_since > 20 and hours_since < 48:  # New day, within 2 days
            streak_days += 1
            # Streak bonus
            if streak_days >= 3:
                new_scores["attachment_score"] = min(1.0, new_scores["attachment_score"] + 0.02)
            if streak_days >= 7:
                new_scores["warmth_score"] = min(1.0, new_scores["warmth_score"] + 0.02)
        elif hours_since >= 48:
            streak_days = 1  # Reset streak
        
        # Determine bestie mood
        bestie_mood = self._determine_bestie_mood(detected_mood, new_scores)
        
        # Update database
        now = datetime.now(timezone.utc)
        update_data = {
            **new_scores,
            "bestie_mood": bestie_mood,
            "last_user_mood": detected_mood,
            "streak_days": streak_days,
            "last_interaction": now.isoformat(),
            "total_messages": current.get("total_messages", 0) + 1,
        }
        
        # Add to mood history (keep last 20)
        mood_entry = {
            "mood": detected_mood,
            "timestamp": now.isoformat(),
            "message_preview": message[:50]
        }
        
        await self.collection.update_one(
            {"user_id": user_id, "bestie_id": bestie_id},
            {
                "$set": update_data,
                "$push": {
                    "mood_history": {
                        "$each": [mood_entry],
                        "$slice": -20  # Keep last 20
                    },
                    "score_history": {
                        "$each": [{
                            "scores": new_scores,
                            "timestamp": now.isoformat()
                        }],
                        "$slice": -50  # Keep last 50
                    }
                }
            }
        )
        
        return {
            **new_scores,
            "user_mood": detected_mood,
            "bestie_mood": bestie_mood,
            "streak_days": streak_days,
            "total_messages": update_data["total_messages"]
        }
    
    async def get_relationship_summary(
        self, 
        user_id: str, 
        bestie_id: str
    ) -> Dict[str, Any]:
        """
        Get a human-readable summary of the relationship.
        """
        scores = await self.get_scores(user_id, bestie_id)
        
        # Determine relationship stage
        avg_score = (
            scores.get("warmth_score", 0) +
            scores.get("trust_score", 0) +
            scores.get("attachment_score", 0)
        ) / 3
        
        if avg_score < 0.3:
            stage = "Getting to Know Each Other"
            description = "You're just starting to build your friendship!"
        elif avg_score < 0.5:
            stage = "Building Trust"
            description = "Your bestie is warming up to you."
        elif avg_score < 0.7:
            stage = "Close Friends"
            description = "You've built a real connection!"
        else:
            stage = "Ride or Die"
            description = "Your bestie would do anything for you!"
        
        return {
            "stage": stage,
            "description": description,
            "warmth": self._score_to_label(scores.get("warmth_score", 0)),
            "trust": self._score_to_label(scores.get("trust_score", 0)),
            "playfulness": self._score_to_label(scores.get("playfulness_score", 0)),
            "attachment": self._score_to_label(scores.get("attachment_score", 0)),
            "streak_days": scores.get("streak_days", 0),
            "total_messages": scores.get("total_messages", 0),
            "raw_scores": {
                "warmth_score": scores.get("warmth_score", 0),
                "trust_score": scores.get("trust_score", 0),
                "playfulness_score": scores.get("playfulness_score", 0),
                "attachment_score": scores.get("attachment_score", 0),
            }
        }
    
    def _score_to_label(self, score: float) -> str:
        """Convert numeric score to human label."""
        if score < 0.2:
            return "Low"
        elif score < 0.4:
            return "Building"
        elif score < 0.6:
            return "Moderate"
        elif score < 0.8:
            return "Strong"
        else:
            return "Very Strong"


# Singleton-style function to get engine instance
_engine_instance: Optional[RelationshipEngine] = None

def get_relationship_engine(db: AsyncIOMotorDatabase) -> RelationshipEngine:
    """Get or create the relationship engine instance."""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = RelationshipEngine(db)
    return _engine_instance
