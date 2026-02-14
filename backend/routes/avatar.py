"""
Avatar routes for user avatar management including virtual try-on.
"""
import logging
import base64
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from config.settings import settings
from services.user_service import UserService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/avatar", tags=["Avatar"])

# Will be set by main app
db = None

# Outfit catalog for virtual try-on (imported from outfits)
OUTFITS_DIR = settings.ROOT_DIR / 'outfits'
OUTFIT_CATALOG = {
    "casual-jeans": [
        {"id": "jeans_tshirt_01", "name": "Classic Denim Look", "file": "jeans_tshirt_01.png"},
        {"id": "jeans_tshirt_02", "name": "Casual Blue Jeans", "file": "jeans_tshirt_02.png"},
        {"id": "jeans_tshirt_03", "name": "Relaxed Fit", "file": "jeans_tshirt_03.png"},
        {"id": "jeans_tshirt_04", "name": "Street Style", "file": "jeans_tshirt_04.png"},
        {"id": "jeans_tshirt_05", "name": "Weekend Casual", "file": "jeans_tshirt_05.png"},
    ],
    "casual-shorts": [
        {"id": "shorts_tshirt_01", "name": "Summer Shorts", "file": "shorts_tshirt_01.png"},
        {"id": "shorts_tshirt_02", "name": "Beach Ready", "file": "shorts_tshirt_02.png"},
        {"id": "shorts_tshirt_03", "name": "Casual Day Out", "file": "shorts_tshirt_03.png"},
        {"id": "shorts_tshirt_04", "name": "Active Style", "file": "shorts_tshirt_04.png"},
        {"id": "shorts_tshirt_05", "name": "Relaxed Summer", "file": "shorts_tshirt_05.png"},
    ],
    "summer-dress": [
        {"id": "summer_dress_01", "name": "Floral Sundress", "file": "summer_dress_01.png"},
        {"id": "summer_dress_02", "name": "Light & Breezy", "file": "summer_dress_02.png"},
        {"id": "summer_dress_03", "name": "Garden Party", "file": "summer_dress_03.png"},
        {"id": "summer_dress_04", "name": "Bohemian Chic", "file": "summer_dress_04.png"},
        {"id": "summer_dress_05", "name": "Casual Elegance", "file": "summer_dress_05.png"},
    ],
    "winter": [
        {"id": "winter_outfit_01", "name": "Cozy Sweater", "file": "winter_outfit_01.png"},
        {"id": "winter_outfit_02", "name": "Warm Layers", "file": "winter_outfit_02.png"},
        {"id": "winter_outfit_03", "name": "Winter Chic", "file": "winter_outfit_03.png"},
        {"id": "winter_outfit_04", "name": "Cold Weather Style", "file": "winter_outfit_04.png"},
        {"id": "winter_outfit_05", "name": "Snug & Stylish", "file": "winter_outfit_05.png"},
    ],
    "party-dress": [
        {"id": "party_dress_01", "name": "Cocktail Glam", "file": "party_dress_01.png"},
        {"id": "party_dress_02", "name": "Night Out", "file": "party_dress_02.png"},
        {"id": "party_dress_03", "name": "Party Ready", "file": "party_dress_03.png"},
        {"id": "party_dress_04", "name": "Celebration Style", "file": "party_dress_04.png"},
        {"id": "party_dress_05", "name": "Dance Floor", "file": "party_dress_05.png"},
    ],
    "evening-gown": [
        {"id": "evening_gown_01", "name": "Elegant Gala", "file": "evening_gown_01.png"},
        {"id": "evening_gown_02", "name": "Red Carpet", "file": "evening_gown_02.png"},
        {"id": "evening_gown_03", "name": "Formal Elegance", "file": "evening_gown_03.png"},
        {"id": "evening_gown_04", "name": "Black Tie", "file": "evening_gown_04.png"},
        {"id": "evening_gown_05", "name": "Grand Entrance", "file": "evening_gown_05.png"},
    ],
}


class VirtualTryOnRequest(BaseModel):
    user_id: str
    person_image: str
    outfit_id: str


class OutfitGenerationRequest(BaseModel):
    user_id: str
    base_image: str
    outfit_description: str
    filter_style: Dict[str, int]


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


@router.post("/create")
async def create_user_avatar(
    user_id: str = Form(...),
    relationship_status: str = Form(...),
    relationship_with: str = Form(...),
    relationship_feel: str = Form(...),
    image: UploadFile = File(...),
    edit_prompt: Optional[str] = Form(None)
):
    """Create user avatar with AI."""
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        image_data = await image.read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        image_gen = OpenAIImageGeneration(api_key=settings.EMERGENT_LLM_KEY)
        
        if edit_prompt:
            prompt = f"Apply only subtle adjustments to this portrait photo: {edit_prompt}. IMPORTANT: Preserve exact facial features, skin texture, and likeness. Only apply very light filter effects, gentle color adjustments, or subtle lighting changes. Keep it looking like the original person."
        else:
            prompt = "Apply a very subtle artistic filter to this portrait photo. IMPORTANT: Keep the exact same person, facial features, and likeness. Only add slight soft glow, gentle color warmth, or light enhancement. The result should look almost identical to the original with just a hint of artistic touch. Natural and realistic."
        
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


@router.get("/refresh/{user_id}")
async def refresh_user_avatar(user_id: str):
    """Regenerate user avatar."""
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        image_gen = OpenAIImageGeneration(api_key=settings.EMERGENT_LLM_KEY)
        prompt = "Apply very subtle artistic filter to this portrait photo. IMPORTANT: Keep the exact same person, preserve all facial features and likeness completely. Only add gentle soft glow or very light color warmth. Should look almost identical to original."
        
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


@router.post("/edit/{user_id}")
async def edit_user_avatar(user_id: str, edit_description: str):
    """Edit user avatar based on description."""
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        image_gen = OpenAIImageGeneration(api_key=settings.EMERGENT_LLM_KEY)
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


@router.post("/virtual-try-on")
async def virtual_try_on(request: VirtualTryOnRequest):
    """Virtual try-on using Google Vertex AI."""
    try:
        from google import genai
        from google.genai import types
        
        # Find the garment image from catalog
        garment_file = None
        garment_name = ""
        for category, outfits in OUTFIT_CATALOG.items():
            for outfit in outfits:
                if outfit["id"] == request.outfit_id:
                    garment_file = OUTFITS_DIR / outfit["file"]
                    garment_name = outfit["name"]
                    break
            if garment_file:
                break
        
        if not garment_file or not garment_file.exists():
            raise HTTPException(status_code=404, detail=f"Outfit {request.outfit_id} not found")
        
        # Read garment image
        with open(garment_file, "rb") as f:
            garment_bytes = f.read()
        
        # Prepare person image
        person_image_data = request.person_image
        if ',' in person_image_data:
            person_image_data = person_image_data.split(',')[1]
        person_bytes = base64.b64decode(person_image_data)
        
        logger.info(f"Virtual try-on: person image ready, garment: {garment_name}")
        
        # Initialize Vertex AI client
        client = genai.Client(
            vertexai=True,
            project=settings.GOOGLE_CLOUD_PROJECT,
            location="us-central1"
        )
        
        person_image = types.Image(image_bytes=person_bytes)
        product_image = types.ProductImage(
            product_image=types.Image(image_bytes=garment_bytes)
        )
        
        source = types.RecontextImageSource(
            person_image=person_image,
            product_images=[product_image]
        )
        
        config = types.RecontextImageConfig(number_of_images=1)
        
        response = client.models.recontext_image(
            model="virtual-try-on-001",
            source=source,
            config=config
        )
        
        if response.generated_images and len(response.generated_images) > 0:
            generated_image = response.generated_images[0]
            image_bytes = generated_image.image.image_bytes
            avatar_base64 = base64.b64encode(image_bytes).decode('utf-8')
            avatar_url = f"data:image/png;base64,{avatar_base64}"
            return {"avatar_url": avatar_url, "success": True, "outfit_name": garment_name}
        else:
            raise HTTPException(status_code=500, detail="No image generated")
            
    except Exception as e:
        logger.error(f"Error in virtual try-on: {str(e)}")
        error_msg = str(e)
        if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
            raise HTTPException(status_code=429, detail="Virtual Try-On quota exceeded. Please try again later.")
        raise HTTPException(status_code=500, detail=f"Virtual try-on failed: {str(e)}")


@router.post("/generate-with-outfit")
async def generate_avatar_with_outfit(request: OutfitGenerationRequest):
    """Generate avatar wearing specified outfit."""
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        image_data = request.base_image.split(',')[1] if ',' in request.base_image else request.base_image
        
        image_gen = OpenAIImageGeneration(api_key=settings.EMERGENT_LLM_KEY)
        
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


@router.get("/{user_id}")
async def get_avatar(user_id: str):
    """Get user's avatar data."""
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "avatar_url": user_doc.get("avatar_url"),
        "relationship_status": user_doc.get("relationship_status"),
        "relationship_with": user_doc.get("relationship_with"),
        "relationship_feel": user_doc.get("relationship_feel")
    }
