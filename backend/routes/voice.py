"""
Voice routes for text-to-speech and speech-to-text.
"""
import logging
import base64
import tempfile
import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends

from config.settings import settings
from services.bestie_service import BestieService
from utils.auth import require_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice"])

# Will be set by main app
db = None

# ElevenLabs voice mapping
VOICE_MAP = {
    "British": "qxjGnozOAtD4eqNuXms4",
    "American": "qxjGnozOAtD4eqNuXms4",
    "Australian": "qxjGnozOAtD4eqNuXms4",
    "Southern": "qxjGnozOAtD4eqNuXms4",
    "New York": "qxjGnozOAtD4eqNuXms4",
    "Valley Girl": "qxjGnozOAtD4eqNuXms4",
    "default": "qxjGnozOAtD4eqNuXms4"
}


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


@router.post("/tts")
async def text_to_speech(bestie_id: str, text: str):
    """Convert text to speech using ElevenLabs."""
    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")
    
    try:
        from elevenlabs import ElevenLabs, VoiceSettings
        
        # Get bestie to determine voice based on accent
        bestie_service = BestieService(db)
        bestie_doc = await bestie_service.get_by_id(bestie_id)
        voice_id = VOICE_MAP.get("default")
        
        if bestie_doc:
            accent = bestie_doc.get("accent", "British")
            voice_id = VOICE_MAP.get(accent, VOICE_MAP["default"])
        
        client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
        
        audio_generator = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            voice_settings=VoiceSettings(
                stability=0.5,
                similarity_boost=0.9,
                style=0.5,
                use_speaker_boost=True
            )
        )
        
        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk
        
        audio_b64 = base64.b64encode(audio_data).decode()
        return {"audio_url": f"data:audio/mpeg;base64,{audio_b64}"}
        
    except Exception as e:
        logger.error(f"Error generating TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stt")
async def speech_to_text(audio_file: UploadFile = File(...)):
    """Convert speech to text using OpenAI Whisper."""
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText
        
        audio_content = await audio_file.read()
        filename = audio_file.filename or "recording.webm"
        
        # Get file extension
        ext = ".webm"
        if filename:
            for valid_ext in ['.webm', '.wav', '.mp3', '.m4a', '.ogg', '.flac', '.mp4', '.mpeg', '.mpga', '.oga']:
                if filename.lower().endswith(valid_ext):
                    ext = valid_ext
                    break
        
        logger.info(f"Processing audio file: {filename}, size: {len(audio_content)} bytes")
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp_file:
            tmp_file.write(audio_content)
            tmp_path = tmp_file.name
        
        try:
            stt = OpenAISpeechToText(api_key=settings.EMERGENT_LLM_KEY)
            
            with open(tmp_path, 'rb') as audio_file_handle:
                response = await stt.transcribe(
                    file=audio_file_handle,
                    model="whisper-1",
                    response_format="json"
                )
            
            return {"text": response.text}
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
