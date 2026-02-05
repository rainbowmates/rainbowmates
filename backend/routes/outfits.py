"""
Outfit routes for outfit catalog and images.
"""
import logging
import base64
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/outfits", tags=["Outfits"])

# Outfit images directory
OUTFITS_DIR = settings.ROOT_DIR / 'outfits'

# Outfit catalog mapping categories to images
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


@router.get("/catalog")
async def get_outfit_catalog():
    """Get the catalog of available outfits organized by category."""
    return OUTFIT_CATALOG


@router.get("/image/{outfit_id}")
async def get_outfit_image(outfit_id: str):
    """Get a specific outfit image by ID."""
    for category, outfits in OUTFIT_CATALOG.items():
        for outfit in outfits:
            if outfit["id"] == outfit_id:
                file_path = OUTFITS_DIR / outfit["file"]
                if file_path.exists():
                    with open(file_path, "rb") as f:
                        image_data = f.read()
                    return Response(content=image_data, media_type="image/png")
                else:
                    raise HTTPException(status_code=404, detail="Image file not found")
    raise HTTPException(status_code=404, detail="Outfit not found")


@router.get("/image-base64/{outfit_id}")
async def get_outfit_image_base64(outfit_id: str):
    """Get a specific outfit image as base64."""
    for category, outfits in OUTFIT_CATALOG.items():
        for outfit in outfits:
            if outfit["id"] == outfit_id:
                file_path = OUTFITS_DIR / outfit["file"]
                if file_path.exists():
                    with open(file_path, "rb") as f:
                        image_data = f.read()
                    b64 = base64.b64encode(image_data).decode('utf-8')
                    return {"image": f"data:image/png;base64,{b64}", "outfit": outfit}
                else:
                    raise HTTPException(status_code=404, detail="Image file not found")
    raise HTTPException(status_code=404, detail="Outfit not found")
