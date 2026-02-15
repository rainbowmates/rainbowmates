"""
Streaming TTS Service with emotion payload and viseme timing for talking avatar.
Handles ElevenLabs TTS streaming and generates emotion/timing data.

Architecture Requirements:
- Streaming neural TTS (Opus codec, 24kHz target)
- Chunked audio streaming for <800ms time-to-first-audio
- Viseme timing data for lip-sync
- Hard cap: 750 spoken replies per user per month
"""
import logging
import base64
import uuid
import json
import re
from typing import Optional, Dict, Any, AsyncGenerator, List, Tuple
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from elevenlabs import ElevenLabs, VoiceSettings

logger = logging.getLogger(__name__)

# Voice configuration for Tom (Luca in new spec)
TOM_VOICE_ID = "onwK4e9ZLuTAKqWW03F9"  # Daniel - British, warm

# Monthly usage hard cap per architecture spec
MONTHLY_USAGE_LIMIT = 750

# Voice settings optimized for avatar
AVATAR_VOICE_SETTINGS = {
    "stability": 0.55,
    "similarity_boost": 0.85,
    "style": 0.65,
    "use_speaker_boost": True
}

# Emotion to voice modulation mapping
EMOTION_VOICE_MAP = {
    "friendly": {"stability": 0.55, "style": 0.65},
    "excited": {"stability": 0.45, "style": 0.80},
    "comforting": {"stability": 0.70, "style": 0.50},
    "playful": {"stability": 0.40, "style": 0.75},
    "sassy": {"stability": 0.45, "style": 0.85},
    "protective": {"stability": 0.65, "style": 0.55},
    "curious": {"stability": 0.50, "style": 0.70},
    "warm": {"stability": 0.60, "style": 0.60},
    "supportive": {"stability": 0.65, "style": 0.55},
    "dramatic": {"stability": 0.35, "style": 0.90},
    "concern": {"stability": 0.65, "style": 0.50},
    "teasing_annoyed": {"stability": 0.45, "style": 0.75},
}

# Viseme mapping for lip-sync (phoneme to mouth shape)
# Standard 15 viseme shapes for English
VISEME_MAP = {
    # Silence
    "sil": 0,
    # Bilabial (p, b, m)
    "p": 1, "b": 1, "m": 1,
    # Labiodental (f, v)  
    "f": 2, "v": 2,
    # Dental (th)
    "th": 3,
    # Alveolar (t, d, n, l)
    "t": 4, "d": 4, "n": 4, "l": 4,
    # Postalveolar (sh, ch, zh, j)
    "sh": 5, "ch": 5, "zh": 5, "j": 5,
    # Velar (k, g, ng)
    "k": 6, "g": 6, "ng": 6,
    # Glottal (h)
    "h": 7,
    # Vowels
    "aa": 8, "ah": 8,  # father, but
    "ae": 9,  # cat
    "eh": 10, # bed
    "ih": 11, # bit
    "iy": 12, # beat
    "oh": 13, "ow": 13, # boat
    "uw": 14, # boot
}


class StreamingTTSService:
    """
    Service for streaming TTS with emotion payload generation.
    """
    
    def __init__(self, api_key: str, db: AsyncIOMotorDatabase):
        self.api_key = api_key
        self.db = db
        self.client = ElevenLabs(api_key=api_key) if api_key else None
        self.usage_collection = db.tts_usage if db is not None else None
    
    async def check_usage_limit(self, user_id: str, limit: int = 750) -> Dict[str, Any]:
        """
        Check if user has exceeded monthly TTS usage limit.
        Returns usage stats and whether they can proceed.
        """
        if self.usage_collection is None:
            return {"allowed": True, "used": 0, "limit": limit}
        
        # Get current month's start
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Count usage this month
        usage_doc = await self.usage_collection.find_one({
            "user_id": user_id,
            "month": month_start.isoformat()
        })
        
        used = usage_doc.get("count", 0) if usage_doc else 0
        
        return {
            "allowed": used < limit,
            "used": used,
            "limit": limit,
            "remaining": max(0, limit - used)
        }
    
    async def increment_usage(self, user_id: str):
        """Increment user's monthly TTS usage count."""
        if self.usage_collection is None:
            return
        
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        await self.usage_collection.update_one(
            {"user_id": user_id, "month": month_start.isoformat()},
            {
                "$inc": {"count": 1},
                "$set": {"last_used": now.isoformat()}
            },
            upsert=True
        )
    
    def generate_emotion_payload(
        self, 
        text: str, 
        emotion: str,
        relationship_scores: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Generate emotion payload for avatar animation.
        This is sent alongside audio for client-side animation control.
        """
        # Estimate speech duration (~150ms per word)
        word_count = len(text.split())
        estimated_duration_ms = word_count * 150
        
        # Calculate expression intensity based on relationship
        warmth = relationship_scores.get("warmth_score", 0.5)
        playfulness = relationship_scores.get("playfulness_score", 0.5)
        attachment = relationship_scores.get("attachment_score", 0.3)
        
        # Determine expression parameters
        expression_intensity = (warmth + playfulness + attachment) / 3
        
        return {
            "emotion": emotion,
            "expression_intensity": round(expression_intensity, 2),
            "estimated_duration_ms": estimated_duration_ms,
            "word_count": word_count,
            "animation_hints": {
                "eyebrow_raise": 0.1 if emotion in ["excited", "curious", "playful"] else 0,
                "smile_intensity": warmth * 0.5,
                "head_tilt": 0.05 if emotion in ["curious", "comforting"] else 0,
                "blink_frequency": "normal" if emotion != "excited" else "fast",
            },
            "voice_modulation": EMOTION_VOICE_MAP.get(emotion, EMOTION_VOICE_MAP["friendly"])
        }
    
    async def generate_speech(
        self,
        text: str,
        user_id: str,
        emotion: str = "friendly",
        relationship_scores: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Generate speech audio with emotion payload.
        Returns base64 audio and emotion data for avatar animation.
        """
        if not self.client:
            raise ValueError("ElevenLabs API key not configured")
        
        # Check usage limit
        usage = await self.check_usage_limit(user_id)
        if not usage["allowed"]:
            return {
                "error": "usage_limit_exceeded",
                "message": f"Monthly limit of {usage['limit']} spoken replies reached",
                "usage": usage
            }
        
        relationship_scores = relationship_scores or {
            "warmth_score": 0.5,
            "trust_score": 0.4,
            "playfulness_score": 0.5,
            "attachment_score": 0.3
        }
        
        # Generate emotion payload
        emotion_payload = self.generate_emotion_payload(
            text, emotion, relationship_scores
        )
        
        # Get voice settings based on emotion
        voice_mod = emotion_payload["voice_modulation"]
        voice_settings = VoiceSettings(
            stability=voice_mod.get("stability", 0.55),
            similarity_boost=AVATAR_VOICE_SETTINGS["similarity_boost"],
            style=voice_mod.get("style", 0.65),
            use_speaker_boost=AVATAR_VOICE_SETTINGS["use_speaker_boost"]
        )
        
        try:
            # Generate TTS audio
            audio_generator = self.client.text_to_speech.convert(
                text=text,
                voice_id=TOM_VOICE_ID,
                model_id="eleven_turbo_v2_5",
                voice_settings=voice_settings
            )
            
            # Collect audio chunks
            audio_data = b""
            for chunk in audio_generator:
                audio_data += chunk
            
            # Encode to base64
            audio_b64 = base64.b64encode(audio_data).decode()
            
            # Increment usage
            await self.increment_usage(user_id)
            
            return {
                "success": True,
                "audio_url": f"data:audio/mpeg;base64,{audio_b64}",
                "emotion_payload": emotion_payload,
                "text": text,
                "usage": await self.check_usage_limit(user_id)
            }
            
        except Exception as e:
            logger.error(f"TTS generation error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_speech_streaming(
        self,
        text: str,
        user_id: str,
        emotion: str = "friendly"
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream speech audio chunks for lower latency.
        Yields audio chunks as they're generated.
        """
        if not self.client:
            raise ValueError("ElevenLabs API key not configured")
        
        # Check usage limit
        usage = await self.check_usage_limit(user_id)
        if not usage["allowed"]:
            raise ValueError(f"Monthly limit of {usage['limit']} reached")
        
        voice_mod = EMOTION_VOICE_MAP.get(emotion, EMOTION_VOICE_MAP["friendly"])
        voice_settings = VoiceSettings(
            stability=voice_mod.get("stability", 0.55),
            similarity_boost=AVATAR_VOICE_SETTINGS["similarity_boost"],
            style=voice_mod.get("style", 0.65),
            use_speaker_boost=AVATAR_VOICE_SETTINGS["use_speaker_boost"]
        )
        
        try:
            audio_generator = self.client.text_to_speech.convert(
                text=text,
                voice_id=TOM_VOICE_ID,
                model_id="eleven_turbo_v2_5",
                voice_settings=voice_settings
            )
            
            for chunk in audio_generator:
                yield chunk
            
            # Increment usage after successful generation
            await self.increment_usage(user_id)
            
        except Exception as e:
            logger.error(f"Streaming TTS error: {str(e)}")
            raise


# Singleton instance
_tts_service: Optional[StreamingTTSService] = None

def get_tts_service(api_key: str, db: AsyncIOMotorDatabase) -> StreamingTTSService:
    """Get or create the TTS service instance."""
    global _tts_service
    if _tts_service is None:
        _tts_service = StreamingTTSService(api_key, db)
    return _tts_service
