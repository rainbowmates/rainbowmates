"""
Shopping routes for product recommendations.
"""
import logging
import re
import json
from fastapi import APIRouter, HTTPException

from config.settings import settings
from models.schemas import ShoppingRequest, Bestie
from services.user_service import UserService, parse_from_mongo
from services.bestie_service import BestieService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/shopping", tags=["Shopping"])

# Will be set by main app
db = None


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


@router.post("/recommendations")
async def get_shopping_recommendations(user_id: str, shopping_data: ShoppingRequest):
    """Get shopping recommendations from bestie based on user request and profile."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        bestie_service = BestieService(db)
        user_service = UserService(db)
        
        bestie_doc = await bestie_service.get_by_id(shopping_data.bestie_id)
        if not bestie_doc:
            raise HTTPException(status_code=404, detail="Bestie not found")
        
        # Get user profile for personalization
        user_doc = await user_service.get_by_id(user_id)
        user_context = ""
        if user_doc:
            if user_doc.get("relationship_status"):
                user_context += f"Relationship status: {user_doc.get('relationship_status')}. "
            if user_doc.get("relationship_with"):
                user_context += f"Interested in: {user_doc.get('relationship_with')}. "
            if user_doc.get("relationship_feel"):
                user_context += f"Current vibe: {user_doc.get('relationship_feel')}. "
        
        # Create shopping prompt
        prompt = f"My friend asked: \"{shopping_data.user_request}\"\n\n"
        
        if user_context:
            prompt += f"About my friend: {user_context}\n"
        
        if shopping_data.style:
            prompt += f"Style preference: {shopping_data.style}. "
        if shopping_data.max_price:
            prompt += f"Budget: up to ${shopping_data.max_price}. "
        if shopping_data.brands:
            prompt += f"Preferred brands: {', '.join(shopping_data.brands)}. "
        
        prompt += "\nGive me 3-5 personalized fashion recommendations with brief descriptions and shopping links."
        
        personality_str = ", ".join(bestie_doc.get("personality", ["friendly", "stylish"]))
        system_message = f"""You are {bestie_doc.get('name', 'Alex')} — a warm and uplifting gay best friend helping with shopping.

Your personality: {personality_str}

**Shopping Assistant Mode:**
- Be warm, supportive, and genuinely helpful
- Keep recommendations brief but thoughtful (3-5 items max)
- Add personality! Use phrases like "Oh honey, this would be PERFECT for you!" 
- Be practical about budgets when mentioned

**Include Shopping Links:**
For EACH item, include clickable links:
- [Shop on ASOS](https://www.asos.com/search/?q=SEARCH_TERM)
- [Shop on Nordstrom](https://www.nordstrom.com/sr?keyword=SEARCH_TERM)

Replace SEARCH_TERM with URL-encoded search terms.

**Response Format (JSON):**
{{
  "recommendations": "Your recommendations with links...",
  "followup_question": "A fun follow-up question"
}}"""
        
        chat = LlmChat(
            api_key=settings.EMERGENT_LLM_KEY,
            session_id=f"shopping_{user_id}_{shopping_data.bestie_id}",
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Try to parse JSON response
        try:
            response_text = response.strip()
            if response_text.startswith('{'):
                parsed = json.loads(response_text)
                return {
                    "recommendations": parsed.get("recommendations", response),
                    "followup_question": parsed.get("followup_question", "What do you think?")
                }
            else:
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    parsed = json.loads(json_match.group())
                    return {
                        "recommendations": parsed.get("recommendations", response),
                        "followup_question": parsed.get("followup_question", "What do you think?")
                    }
        except:
            pass
        
        return {
            "recommendations": response,
            "followup_question": "What do you think, babe? Any of these catching your eye?"
        }
        
    except Exception as e:
        logger.error(f"Error getting shopping recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
