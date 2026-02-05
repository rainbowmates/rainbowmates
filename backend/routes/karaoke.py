"""
Karaoke routes for lyrics and singing.
"""
import logging
import base64
import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/karaoke", tags=["Karaoke"])

# Will be set by main app
db = None

# ElevenLabs voice mapping for singing
VOICE_MAP = {
    "British": "qxjGnozOAtD4eqNuXms4",
    "American": "qxjGnozOAtD4eqNuXms4",
    "Australian": "qxjGnozOAtD4eqNuXms4",
    "Southern": "qxjGnozOAtD4eqNuXms4",
    "New York": "qxjGnozOAtD4eqNuXms4",
    "Valley Girl": "qxjGnozOAtD4eqNuXms4",
    "default": "qxjGnozOAtD4eqNuXms4"
}


class LyricsRequest(BaseModel):
    song_title: str
    artist: Optional[str] = None


class SingRequest(BaseModel):
    bestie_id: str
    lyrics: str
    song_title: str


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


@router.post("/lyrics")
async def get_lyrics(request: LyricsRequest):
    """
    Get a song description for karaoke display.
    Returns fun karaoke prompts for the bestie to sing along.
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=settings.EMERGENT_LLM_KEY,
            model="claude-3-5-haiku-20241022"
        )
        
        prompt = f"""Create fun karaoke sing-along prompts for the song "{request.song_title}"{f' by {request.artist}' if request.artist else ''}.

Generate 10-15 short, fun lines that capture the spirit and emotion of this song. These should be:
- Catchy phrases inspired by the song's theme
- Encouraging singing prompts like "Here comes the chorus!" or "Sing it loud!"
- Fun exclamations matching the song's mood
- Short memorable phrases (4-8 words each)

Do NOT include actual song lyrics. Instead, create original prompts that match the song's energy.
Format: One line per prompt, no numbers or bullets."""

        response = await chat.send_message_async(
            message=UserMessage(content=prompt)
        )
        
        prompts_text = response.content.strip()
        
        # Parse into lines
        lines = []
        for line in prompts_text.split('\n'):
            stripped = line.strip()
            if stripped and len(stripped) > 3:
                lines.append(stripped)
        
        return {
            "song_title": request.song_title,
            "artist": request.artist,
            "lyrics": prompts_text,
            "lines": lines
        }
        
    except Exception as e:
        logger.error(f"Error getting lyrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sing")
async def sing_lyrics(request: SingRequest):
    """
    Generate TTS audio of bestie singing/reading lyrics.
    Returns audio in chunks for streaming playback.
    """
    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")
    
    try:
        from elevenlabs import ElevenLabs, VoiceSettings
        
        # Get bestie accent
        voice_id = VOICE_MAP["default"]
        if db is not None:
            bestie_doc = await db.besties.find_one({"id": request.bestie_id}, {"_id": 0})
            if bestie_doc:
                accent = bestie_doc.get("accent", "British")
                voice_id = VOICE_MAP.get(accent, VOICE_MAP["default"])
        
        client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
        
        # Add some expression to make it more song-like
        singing_text = request.lyrics.replace('\n\n', '... ... ').replace('\n', '... ')
        
        audio_generator = client.text_to_speech.convert(
            text=singing_text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            voice_settings=VoiceSettings(
                stability=0.3,  # Lower stability for more expressive singing
                similarity_boost=0.8,
                style=0.7,  # Higher style for more emotional delivery
                use_speaker_boost=True
            )
        )
        
        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk
        
        audio_b64 = base64.b64encode(audio_data).decode()
        
        return {
            "audio_url": f"data:audio/mpeg;base64,{audio_b64}",
            "song_title": request.song_title
        }
        
    except Exception as e:
        logger.error(f"Error generating singing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sing-line")
async def sing_single_line(bestie_id: str, line: str):
    """
    Generate TTS audio for a single lyrics line.
    Useful for real-time karaoke sync.
    """
    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")
    
    if not line.strip():
        return {"audio_url": None, "line": line}
    
    try:
        from elevenlabs import ElevenLabs, VoiceSettings
        
        # Get bestie accent
        voice_id = VOICE_MAP["default"]
        if db is not None:
            bestie_doc = await db.besties.find_one({"id": bestie_id}, {"_id": 0})
            if bestie_doc:
                accent = bestie_doc.get("accent", "British")
                voice_id = VOICE_MAP.get(accent, VOICE_MAP["default"])
        
        client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
        
        audio_generator = client.text_to_speech.convert(
            text=line,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            voice_settings=VoiceSettings(
                stability=0.35,
                similarity_boost=0.85,
                style=0.6,
                use_speaker_boost=True
            )
        )
        
        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk
        
        audio_b64 = base64.b64encode(audio_data).decode()
        
        return {
            "audio_url": f"data:audio/mpeg;base64,{audio_b64}",
            "line": line
        }
        
    except Exception as e:
        logger.error(f"Error generating line TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
