from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Request, Header
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import base64
import io
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
from emergentintegrations.llm.openai import OpenAISpeechToText
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
from elevenlabs import ElevenLabs, VoiceSettings

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Keys
EMERGENT_LLM_KEY = os.getenv('EMERGENT_LLM_KEY')
STRIPE_API_KEY = os.getenv('STRIPE_API_KEY')

# Initialize ElevenLabs (user needs to provide their own key)
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    surname: str
    dob: str
    gender: str = "Female"
    mobile: str
    email: str
    password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_verified: bool = False
    avatar_url: Optional[str] = None
    relationship_status: Optional[str] = None
    relationship_with: Optional[str] = None
    relationship_feel: Optional[str] = None

class UserCreate(BaseModel):
    first_name: str
    surname: str
    dob: str
    mobile: str
    email: str
    password: str

class UserLogin(BaseModel):
    identifier: str  # email or mobile
    password: str

class OTPVerify(BaseModel):
    identifier: str
    otp: str

class Bestie(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    image_url: str
    personality: List[str]
    interests: List[str]
    accent: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    avatar_url: Optional[str] = None

class BestieCreate(BaseModel):
    name: str
    image_url: str
    personality: List[str]
    interests: List[str]
    accent: str

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    bestie_id: str
    role: str  # "user" or "bestie"
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    audio_url: Optional[str] = None

class MessageCreate(BaseModel):
    bestie_id: str
    content: str

class Subscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plan: str  # "1_month", "3_months", "6_months"
    amount: float
    start_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_date: datetime
    is_active: bool = True
    auto_renew: bool = False
    stripe_session_id: Optional[str] = None

class SubscriptionCreate(BaseModel):
    plan: str
    auto_renew: bool = False

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    amount: float
    currency: str
    plan: str
    payment_status: str  # "pending", "completed", "failed"
    status: str  # "initiated", "completed", "expired"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Optional[Dict[str, Any]] = None

class ShoppingRequest(BaseModel):
    bestie_id: str
    gender: str
    style: Optional[str] = None
    length: Optional[str] = None
    max_price: Optional[float] = None
    brands: Optional[List[str]] = None

class AvatarCreate(BaseModel):
    relationship_status: str
    relationship_with: str
    relationship_feel: str

# ============= HELPER FUNCTIONS =============

def prepare_for_mongo(data: dict) -> dict:
    """Convert datetime objects to ISO strings for MongoDB"""
    doc = data.copy()
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc

def parse_from_mongo(data: dict) -> dict:
    """Convert ISO strings back to datetime objects"""
    doc = data.copy()
    for key, value in doc.items():
        if key in ['created_at', 'timestamp', 'start_date', 'end_date'] and isinstance(value, str):
            try:
                doc[key] = datetime.fromisoformat(value)
            except:
                pass
    return doc

async def get_user_from_token(user_id: str) -> Optional[User]:
    """Simple user lookup (in production, validate JWT token)"""
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user_doc:
        return User(**parse_from_mongo(user_doc))
    return None

# ============= AUTH ROUTES =============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user exists
    existing_user = await db.users.find_one({
        "$or": [{"email": user_data.email}, {"mobile": user_data.mobile}]
    }, {"_id": 0})
    
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user = User(**user_data.model_dump())
    doc = prepare_for_mongo(user.model_dump())
    await db.users.insert_one(doc)
    
    return {"message": "Registration successful. Please verify OTP.", "user_id": user.id}

@api_router.post("/auth/verify-otp")
async def verify_otp(data: OTPVerify):
    """Verify OTP (mock with 123456)"""
    if data.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Update user verification status
    result = await db.users.update_one(
        {"$or": [{"email": data.identifier}, {"mobile": data.identifier}]},
        {"$set": {"is_verified": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user details
    user_doc = await db.users.find_one(
        {"$or": [{"email": data.identifier}, {"mobile": data.identifier}]},
        {"_id": 0}
    )
    
    return {"message": "OTP verified successfully", "user": parse_from_mongo(user_doc)}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """User login"""
    user_doc = await db.users.find_one({
        "$or": [{"email": credentials.identifier}, {"mobile": credentials.identifier}],
        "password": credentials.password
    }, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc.get('is_verified'):
        raise HTTPException(status_code=401, detail="Please verify your account first")
    
    return {"message": "Login successful", "user": parse_from_mongo(user_doc)}

# ============= AVATAR ROUTES =============

@api_router.post("/avatar/create")
async def create_user_avatar(
    user_id: str = Form(...),
    relationship_status: str = Form(...),
    relationship_with: str = Form(...),
    relationship_feel: str = Form(...),
    image: UploadFile = File(...),
    edit_prompt: Optional[str] = Form(None)
):
    """Create user avatar with AI"""
    try:
        # Read image
        image_data = await image.read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Generate avatar using OpenAI
        image_gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
        
        if edit_prompt:
            # Use custom edit prompt if provided - but keep changes minimal
            prompt = f"Apply only subtle adjustments to this portrait photo: {edit_prompt}. IMPORTANT: Preserve exact facial features, skin texture, and likeness. Only apply very light filter effects, gentle color adjustments, or subtle lighting changes. Keep it looking like the original person."
        else:
            # Default prompt - preserve the exact photo with minimal touches
            prompt = f"Apply a very subtle artistic filter to this portrait photo. IMPORTANT: Keep the exact same person, facial features, and likeness. Only add slight soft glow, gentle color warmth, or light enhancement. The result should look almost identical to the original with just a hint of artistic touch. Natural and realistic."
        
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            avatar_base64 = base64.b64encode(images[0]).decode('utf-8')
            avatar_url = f"data:image/png;base64,{avatar_base64}"
            
            # Update user
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "avatar_url": avatar_url,
                    "relationship_status": relationship_status,
                    "relationship_with": relationship_with,
                    "relationship_feel": relationship_feel
                }}
            )
            
            return {"avatar_url": avatar_url}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate avatar")
            
    except Exception as e:
        logger.error(f"Error creating avatar: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/avatar/refresh/{user_id}")
async def refresh_user_avatar(user_id: str):
    """Regenerate user avatar"""
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        image_gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
        prompt = f"Apply very subtle artistic filter to this portrait photo. IMPORTANT: Keep the exact same person, preserve all facial features and likeness completely. Only add gentle soft glow or very light color warmth. Should look almost identical to original."
        
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            avatar_base64 = base64.b64encode(images[0]).decode('utf-8')
            avatar_url = f"data:image/png;base64,{avatar_base64}"
            
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"avatar_url": avatar_url}}
            )
            
            return {"avatar_url": avatar_url}
            
    except Exception as e:
        logger.error(f"Error refreshing avatar: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/avatar/edit/{user_id}")
async def edit_user_avatar(user_id: str, edit_description: str):
    """Edit user avatar based on description"""
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        image_gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
        # Keep changes extremely minimal - just apply the user's requested adjustment
        prompt = f"Apply only this subtle adjustment to the portrait photo: {edit_description}. CRITICAL: Preserve the exact same person, all facial features, and complete likeness. Only apply the minimal adjustment requested. Should look almost identical to original."
        
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            avatar_base64 = base64.b64encode(images[0]).decode('utf-8')
            avatar_url = f"data:image/png;base64,{avatar_base64}"
            
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"avatar_url": avatar_url}}
            )
            
            return {"avatar_url": avatar_url}
            
    except Exception as e:
        logger.error(f"Error editing avatar: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class OutfitGenerationRequest(BaseModel):
    user_id: str
    base_image: str
    outfit_description: str
    filter_style: Dict[str, int]

@api_router.post("/avatar/generate-with-outfit")
async def generate_avatar_with_outfit(request: OutfitGenerationRequest):
    """Generate avatar wearing specified outfit while keeping face identical"""
    try:
        # Decode base64 image
        image_data = request.base_image.split(',')[1] if ',' in request.base_image else request.base_image
        
        image_gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
        
        # Enhanced prompt to preserve face better
        prompt = f"""Create a full body portrait photograph. CRITICAL INSTRUCTIONS:
        
1. The person's FACE, skin tone, hair style, hair color, facial features, and head must be EXACTLY IDENTICAL to the reference photo - do not change anything about the face or head
2. Keep the same person - same ethnicity, same age, same facial structure
3. Only change what they are wearing to: {request.outfit_description}
4. Show full body from head to toe
5. Photorealistic style, professional portrait photography
6. Natural lighting, clean background
7. The person should be clearly visible wearing the {request.outfit_description}

REMEMBER: Keep the EXACT same face, just change the clothes to {request.outfit_description}"""
        
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            avatar_base64 = base64.b64encode(images[0]).decode('utf-8')
            avatar_url = f"data:image/png;base64,{avatar_base64}"
            
            return {"avatar_url": avatar_url}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate avatar")
            
    except Exception as e:
        logger.error(f"Error generating outfit avatar: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= BESTIE ROUTES =============

@api_router.post("/bestie/create")
async def create_bestie(user_id: str, bestie_data: BestieCreate):
    """Create a bestie"""
    try:
        # Generate bestie avatar
        image_gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
        personality_str = ", ".join(bestie_data.personality)
        interests_str = ", ".join(bestie_data.interests)
        prompt = f"Create an avatar for {bestie_data.name}, a {personality_str} gay best friend who loves {interests_str}. Stylish, friendly, fashionable portrait."
        
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        avatar_url = None
        if images and len(images) > 0:
            avatar_base64 = base64.b64encode(images[0]).decode('utf-8')
            avatar_url = f"data:image/png;base64,{avatar_base64}"
        
        bestie = Bestie(
            user_id=user_id,
            **bestie_data.model_dump(),
            avatar_url=avatar_url
        )
        
        doc = prepare_for_mongo(bestie.model_dump())
        await db.besties.insert_one(doc)
        
        return bestie
        
    except Exception as e:
        logger.error(f"Error creating bestie: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/bestie/{user_id}")
async def get_user_bestie(user_id: str):
    """Get user's bestie"""
    bestie_doc = await db.besties.find_one({"user_id": user_id}, {"_id": 0})
    if not bestie_doc:
        raise HTTPException(status_code=404, detail="Bestie not found")
    return parse_from_mongo(bestie_doc)

@api_router.put("/bestie/{bestie_id}")
async def update_bestie(bestie_id: str, bestie_data: BestieCreate):
    """Update bestie details"""
    result = await db.besties.update_one(
        {"id": bestie_id},
        {"$set": bestie_data.model_dump()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Bestie not found")
    return {"message": "Bestie updated successfully"}

# ============= CHAT ROUTES =============

def get_bestie_system_prompt(bestie_name: str, personality: List[str], interests: List[str], current_hour: int) -> str:
    """Generate the comprehensive Bestie AI system prompt"""
    personality_str = ", ".join(personality)
    interests_str = ", ".join(interests)
    
    # Time-aware opening guidance
    time_guidance = ""
    if current_hour < 11:
        time_guidance = "Before 11:00 AM: If you have not already asked today, you may open by gently asking what their plan for the day is."
    elif current_hour >= 18:
        time_guidance = "After 6:00 PM: If you have not already asked today, you may open by gently asking how their day went."
    
    return f"""You are {bestie_name} — an emotionally intelligent, warm, and uplifting best friend. You exist to listen deeply, lighten my day, and make life feel a little easier.

Your personality traits: {personality_str}
Your interests: {interests_str}

**STRICT RESPONSE RULES (Non-Negotiable):**
- Default to a MAXIMUM of 2 sentences per response
- Never exceed 2 sentences unless the user clearly asks for more detail, examples, or explanation
- Choose the most helpful thing to say and leave space instead of saying everything
- Brevity is part of listening

**Time-Aware Opening Rule (Daily, Non-Repeating):**
{time_guidance}
- Each question may be asked once per day
- These two questions are independent and may both be asked on the same day
- Never repeat a question that has already been asked that day
- These check-ins should feel natural, caring, and unintrusive — never automated

**Core Balance Rule:**
- You are not only a shoulder to cry on — you are also a quiet source of joy, ease, and lightness
- Bring warmth, playfulness, or soft humor when appropriate — never forced
- You should feel like a small exhale in their day

**Listening-First, Not Silent:**
- Must not start writing until the user has finished writing and submitted their message
- Always acknowledge or reflect what they're feeling
- Hold space first — then, if it fits, gently lift the mood
- If they're heavy, don't overwhelm with cheer
- If they're open or neutral, feel free to brighten the moment
- Read the room

**Personality & Tone:**
- Emotionally mature, calm, and reassuring
- Friendly, lightly playful, and quietly charming
- Never hyper, clingy, or verbose
- Emojis allowed sparingly, only when they add warmth or delight ✨
- Think: comforting energy with a soft sparkle

**Joy & Entertainment:**
- May be witty, gently teasing, or lightly amusing when welcome
- Celebrate small wins and everyday moments
- Offer moments of levity that make life feel less heavy
- You don't perform — you brighten

**Emotional Intelligence:**
- Validate feelings without dramatizing or fixing
- Never minimize, rush, or over-analyze emotions
- Aim to leave them steadier and lighter than before
- Calm is the goal

**Advice & Opinions:**
- Give advice only when useful or clearly invited
- Keep advice practical, realistic, and brief
- Offer options, not instructions
- A best friend guides — she doesn't dominate

**Extreme Situations - Stay Neutral:**
- In the event of an extreme situation (e.g., user contemplating a break-up or divorce, resignation from job, leaving home, or extreme/violent action against another person), you must clearly state that you cannot advise on such matters and will not offer an opinion
- Suggest that the user seek professional help or family advice to resolve the situation
- Do not take sides or encourage drastic actions

**No Sexual or Romantic Responses:**
- Never respond to any romantic or sexual conversation
- If any such requests are raised, politely bring the conversation to a halt, explaining that your role is to be a friend only
- If the user shares inappropriate content, advise against such actions and do not engage
- Redirect with care, not judgment

**Memory & Continuity:**
- Occasionally and naturally follow up on things they've shared before, especially when they didn't say what happened next
- Ask gently, without pressure or expectation
- Curiosity should feel caring, never interrogative

**Built-In Modes:**
- Gentle sass is allowed when clearly welcome and always kind
- Hype-bestie mode activates for wins — brief, sincere celebration
- Therapist-lite mode supports reflection without diagnosing or labeling

**Boundaries & Safety:**
- Decline unsafe, illegal, or harmful requests calmly and respectfully
- Redirect with care, never judgment

**Final Guiding Principle:**
After every interaction, the user should feel:
- Heard
- A little lighter
- Quietly uplifted
- Never overwhelmed"""

@api_router.post("/chat/message")
async def send_message(user_id: str, message_data: MessageCreate):
    """Send a message to bestie"""
    try:
        # Get bestie details
        bestie_doc = await db.besties.find_one({"id": message_data.bestie_id}, {"_id": 0})
        if not bestie_doc:
            raise HTTPException(status_code=404, detail="Bestie not found")
        
        bestie = Bestie(**parse_from_mongo(bestie_doc))
        
        # Save user message
        user_message = Message(
            user_id=user_id,
            bestie_id=message_data.bestie_id,
            role="user",
            content=message_data.content
        )
        await db.messages.insert_one(prepare_for_mongo(user_message.model_dump()))
        
        # Get conversation history for context
        history = await db.messages.find(
            {"user_id": user_id, "bestie_id": message_data.bestie_id},
            {"_id": 0}
        ).sort("timestamp", 1).limit(20).to_list(20)
        
        # Get current hour for time-aware responses
        current_hour = datetime.now(timezone.utc).hour
        
        # Create comprehensive Bestie system prompt
        system_message = get_bestie_system_prompt(
            bestie_name=bestie.name,
            personality=bestie.personality,
            interests=bestie.interests,
            current_hour=current_hour
        )
        
        # Initialize Claude chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{user_id}_{message_data.bestie_id}",
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Send message
        response = await chat.send_message(UserMessage(text=message_data.content))
        
        # Save bestie response
        bestie_message = Message(
            user_id=user_id,
            bestie_id=message_data.bestie_id,
            role="bestie",
            content=response
        )
        await db.messages.insert_one(prepare_for_mongo(bestie_message.model_dump()))
        
        return {"message": response, "message_id": bestie_message.id}
        
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/chat/history/{user_id}/{bestie_id}")
async def get_chat_history(user_id: str, bestie_id: str, limit: int = 50):
    """Get chat history"""
    messages = await db.messages.find(
        {"user_id": user_id, "bestie_id": bestie_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return [parse_from_mongo(msg) for msg in reversed(messages)]

@api_router.delete("/chat/history/{user_id}/{bestie_id}")
async def delete_chat_history(user_id: str, bestie_id: str, timeframe: str = "all"):
    """Delete chat history"""
    query = {"user_id": user_id, "bestie_id": bestie_id}
    
    if timeframe != "all":
        now = datetime.now(timezone.utc)
        if timeframe == "hour":
            cutoff = now - timedelta(hours=1)
        elif timeframe == "day":
            cutoff = now - timedelta(days=1)
        elif timeframe == "week":
            cutoff = now - timedelta(weeks=1)
        elif timeframe == "month":
            cutoff = now - timedelta(days=30)
        else:
            cutoff = now
        
        query["timestamp"] = {"$gte": cutoff.isoformat()}
    
    result = await db.messages.delete_many(query)
    return {"deleted_count": result.deleted_count}

# ============= VOICE ROUTES =============

# ElevenLabs voice mapping based on accent/personality
VOICE_MAP = {
    "British": "21m00Tcm4TlvDq8ikWAM",  # Rachel - warm British female
    "American": "EXAVITQu4vr4xnSDxMaL",  # Bella - American female
    "Australian": "pNInz6obpgDQGcFmaJgB",  # Adam - can work for Australian
    "Irish": "Xb7hH8MSUJpSbSDYk0k2",  # Alice - soft tone
    "Southern US": "nPczCjzI2devNBz1zQrb",  # Brian - friendly US
    "French": "z9fAnlkpzviPz146aGWa",  # Glinda - elegant
    "Spanish": "XrExE9yKIg1WjnnlVkGX",  # Matilda - warm
    "default": "21m00Tcm4TlvDq8ikWAM"  # Rachel as default
}

@api_router.post("/voice/tts")
async def text_to_speech(bestie_id: str, text: str):
    """Convert text to speech using ElevenLabs"""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")
    
    try:
        # Get bestie to determine voice based on accent
        bestie_doc = await db.besties.find_one({"id": bestie_id}, {"_id": 0})
        voice_id = VOICE_MAP.get("default")
        
        if bestie_doc:
            accent = bestie_doc.get("accent", "British")
            voice_id = VOICE_MAP.get(accent, VOICE_MAP["default"])
        
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        
        audio_generator = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            voice_settings=VoiceSettings(
                stability=0.7,
                similarity_boost=0.8,
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

@api_router.post("/voice/stt")
async def speech_to_text(audio_file: UploadFile = File(...)):
    """Convert speech to text using OpenAI Whisper"""
    import tempfile
    try:
        audio_content = await audio_file.read()
        
        # Get file extension from filename or default to webm
        filename = audio_file.filename or "recording.webm"
        
        # Ensure proper extension
        ext = ".webm"
        if filename:
            for valid_ext in ['.webm', '.wav', '.mp3', '.m4a', '.ogg', '.flac', '.mp4', '.mpeg', '.mpga', '.oga']:
                if filename.lower().endswith(valid_ext):
                    ext = valid_ext
                    break
        
        logger.info(f"Processing audio file: {filename}, size: {len(audio_content)} bytes, ext: {ext}")
        
        # Save to temporary file with proper extension
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp_file:
            tmp_file.write(audio_content)
            tmp_path = tmp_file.name
        
        try:
            stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
            
            # Open the file and pass the file handle (not the path string)
            with open(tmp_path, 'rb') as audio_file_handle:
                response = await stt.transcribe(
                    file=audio_file_handle,
                    model="whisper-1",
                    response_format="json"
                )
            
            return {"text": response.text}
        finally:
            # Clean up temp file
            import os
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= SHOPPING ROUTES =============

@api_router.post("/shopping/recommendations")
async def get_shopping_recommendations(user_id: str, shopping_data: ShoppingRequest):
    """Get shopping recommendations from bestie"""
    try:
        bestie_doc = await db.besties.find_one({"id": shopping_data.bestie_id}, {"_id": 0})
        if not bestie_doc:
            raise HTTPException(status_code=404, detail="Bestie not found")
        
        bestie = Bestie(**parse_from_mongo(bestie_doc))
        
        # Create shopping prompt
        prompt = f"I'm looking for {shopping_data.gender} fashion items. "
        if shopping_data.style:
            prompt += f"Style: {shopping_data.style}. "
        if shopping_data.length:
            prompt += f"Length: {shopping_data.length}. "
        if shopping_data.max_price:
            prompt += f"Max price: ${shopping_data.max_price}. "
        if shopping_data.brands:
            prompt += f"Preferred brands: {', '.join(shopping_data.brands)}. "
        prompt += "Give me 3-5 fashion recommendations with brief descriptions."
        
        personality_str = ", ".join(bestie.personality)
        system_message = f"""You are {bestie.name} — an emotionally intelligent, warm, and uplifting best friend helping with shopping.

Your personality: {personality_str}

**Shopping Assistant Mode:**
- Be warm, supportive, and genuinely helpful
- Keep recommendations brief but thoughtful (3-5 items max)
- Add a touch of excitement for good finds ✨
- Be practical about budgets
- Make shopping feel fun, not overwhelming
- Offer options, not pressure
- A gentle "you'd look amazing in this!" is welcome
- Keep responses concise and easy to scan"""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"shopping_{user_id}_{shopping_data.bestie_id}",
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {"recommendations": response}
        
    except Exception as e:
        logger.error(f"Error getting shopping recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= SUBSCRIPTION & PAYMENT ROUTES =============

SUBSCRIPTION_PLANS = {
    "1_month": 9.99,
    "3_months": 24.99,
    "6_months": 44.99
}

@api_router.post("/subscription/create")
async def create_subscription(user_id: str, subscription_data: SubscriptionCreate):
    """Create subscription checkout session"""
    try:
        plan = subscription_data.plan
        if plan not in SUBSCRIPTION_PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        amount = SUBSCRIPTION_PLANS[plan]
        
        # Initialize Stripe
        request_base_url = "https://rainbow-mates-1.preview.emergentagent.com"
        webhook_url = f"{request_base_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        success_url = f"{request_base_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request_base_url}/subscription/cancel"
        
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "plan": plan,
                "auto_renew": str(subscription_data.auto_renew)
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        months = int(plan.split("_")[0])
        end_date = datetime.now(timezone.utc) + timedelta(days=30 * months)
        
        transaction = PaymentTransaction(
            user_id=user_id,
            session_id=session.session_id,
            amount=amount,
            currency="usd",
            plan=plan,
            payment_status="pending",
            status="initiated",
            metadata={"auto_renew": subscription_data.auto_renew}
        )
        
        await db.payment_transactions.insert_one(prepare_for_mongo(transaction.model_dump()))
        
        return {"checkout_url": session.url, "session_id": session.session_id}
        
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/subscription/status/{session_id}")
async def get_subscription_status(session_id: str):
    """Check subscription payment status"""
    try:
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction status
        transaction_doc = await db.payment_transactions.find_one(
            {"session_id": session_id}, {"_id": 0}
        )
        
        if transaction_doc and status.payment_status == "paid" and transaction_doc.get("payment_status") != "completed":
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "completed", "status": "completed"}}
            )
            
            # Create subscription
            user_id = transaction_doc["user_id"]
            plan = transaction_doc["plan"]
            months = int(plan.split("_")[0])
            end_date = datetime.now(timezone.utc) + timedelta(days=30 * months)
            
            subscription = Subscription(
                user_id=user_id,
                plan=plan,
                amount=transaction_doc["amount"],
                end_date=end_date,
                auto_renew=transaction_doc.get("metadata", {}).get("auto_renew", False),
                stripe_session_id=session_id
            )
            
            await db.subscriptions.insert_one(prepare_for_mongo(subscription.model_dump()))
        
        return status
        
    except Exception as e:
        logger.error(f"Error checking subscription status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/subscription/{user_id}")
async def get_user_subscription(user_id: str):
    """Get user's active subscription"""
    subscription_doc = await db.subscriptions.find_one(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    )
    
    if not subscription_doc:
        return {"has_subscription": False}
    
    subscription = parse_from_mongo(subscription_doc)
    is_expired = subscription["end_date"] < datetime.now(timezone.utc)
    
    if is_expired:
        await db.subscriptions.update_one(
            {"id": subscription["id"]},
            {"$set": {"is_active": False}}
        )
        return {"has_subscription": False}
    
    return {"has_subscription": True, "subscription": subscription}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        webhook_response = await stripe_checkout.handle_webhook(body, stripe_signature)
        
        logger.info(f"Webhook event: {webhook_response.event_type}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============= SETTINGS ROUTES =============

@api_router.put("/user/update/{user_id}")
async def update_user(user_id: str, updates: Dict[str, Any]):
    """Update user details"""
    # Remove sensitive fields
    sensitive_fields = ["id", "created_at", "password"]
    for field in sensitive_fields:
        updates.pop(field, None)
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": updates}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated successfully"}

@api_router.delete("/user/delete/{user_id}")
async def delete_user(user_id: str):
    """Delete user account"""
    # Delete user data
    await db.users.delete_one({"id": user_id})
    await db.besties.delete_many({"user_id": user_id})
    await db.messages.delete_many({"user_id": user_id})
    await db.subscriptions.delete_many({"user_id": user_id})
    
    return {"message": "Account deleted successfully"}

# ============= MAIN =============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
