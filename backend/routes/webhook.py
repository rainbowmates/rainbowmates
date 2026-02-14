"""
Webhook routes for external service callbacks.
"""
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request

from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["Webhooks"])

# Will be set by main app
db = None

# Subscription plans (same as subscription.py)
SUBSCRIPTION_PLANS = {
    "1_month": {"price": 999, "months": 1, "name": "1 Month"},
    "3_months": {"price": 2499, "months": 3, "name": "3 Months"},
    "6_months": {"price": 3999, "months": 6, "name": "6 Months"}
}


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    try:
        payload = await request.body()
        
        # In production, verify webhook signature
        # For now, just process the event
        import json
        event = json.loads(payload)
        
        event_type = event.get("type")
        data = event.get("data", {}).get("object", {})
        
        logger.info(f"Received Stripe webhook: {event_type}")
        
        if event_type == "checkout.session.completed":
            session_id = data.get("id")
            payment_status = data.get("payment_status")
            
            if payment_status == "paid":
                # Find the transaction
                transaction = await db.payment_transactions.find_one({"session_id": session_id})
                
                if transaction:
                    user_id = transaction.get("user_id")
                    plan = transaction.get("plan")
                    months = SUBSCRIPTION_PLANS.get(plan, {}).get("months", 1)
                    
                    # Create subscription
                    subscription = {
                        "user_id": user_id,
                        "plan": plan,
                        "amount": transaction.get("amount"),
                        "start_date": datetime.now(timezone.utc).isoformat(),
                        "end_date": (datetime.now(timezone.utc) + timedelta(days=30*months)).isoformat(),
                        "is_active": True,
                        "stripe_session_id": session_id
                    }
                    
                    await db.subscriptions.update_one(
                        {"user_id": user_id},
                        {"$set": subscription},
                        upsert=True
                    )
                    
                    # Update transaction
                    await db.payment_transactions.update_one(
                        {"session_id": session_id},
                        {"$set": {"payment_status": "completed", "status": "completed"}}
                    )
                    
                    logger.info(f"Subscription activated for user {user_id}")
        
        return {"status": "received"}
        
    except Exception as e:
        logger.error(f"Stripe webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
