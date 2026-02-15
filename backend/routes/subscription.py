"""
Subscription and payment routes.
"""
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request

from config.settings import settings
from models.schemas import SubscriptionCreate
from services.user_service import UserService, prepare_for_mongo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscription", tags=["Subscription"])

# Will be set by main app
db = None

# Subscription plans
SUBSCRIPTION_PLANS = {
    "1_month": {"price": 999, "months": 1, "name": "1 Month"},
    "3_months": {"price": 2499, "months": 3, "name": "3 Months"},
    "6_months": {"price": 3999, "months": 6, "name": "6 Months"}
}


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


@router.post("/create")
async def create_subscription(user_id: str, subscription: SubscriptionCreate):
    """Create a new subscription checkout session."""
    try:
        from emergentintegrations.payments.stripe.checkout import (
            StripeCheckout, CheckoutSessionRequest
        )
        
        if subscription.plan not in SUBSCRIPTION_PLANS:
            raise HTTPException(status_code=400, detail="Invalid subscription plan")
        
        plan = SUBSCRIPTION_PLANS[subscription.plan]
        
        # Determine redirect URLs based on environment
        app_url = settings.APP_URL
        if not app_url:
            app_url = "https://bestie-image-feature.preview.emergentagent.com"
        
        success_url = f"{app_url}/subscription?status=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{app_url}/subscription?status=cancelled"
        
        # Create Stripe checkout session
        checkout = StripeCheckout(api_key=settings.STRIPE_API_KEY)
        
        session_request = CheckoutSessionRequest(
            amount=plan["price"],
            product_name=f"Rainbow Mates - {plan['name']} Subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "plan": subscription.plan,
                "months": plan["months"]
            }
        )
        
        session = await checkout.create_checkout_session(session_request)
        
        # Store transaction
        transaction = {
            "user_id": user_id,
            "session_id": session.session_id,
            "amount": plan["price"],
            "currency": "usd",
            "plan": subscription.plan,
            "payment_status": "pending",
            "status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "checkout_url": session.checkout_url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{session_id}")
async def get_subscription_status(session_id: str):
    """Get the status of a checkout session."""
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        checkout = StripeCheckout(api_key=settings.STRIPE_API_KEY)
        status = await checkout.get_session_status(session_id)
        
        if status.payment_status == "paid":
            # Update transaction
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction:
                user_id = transaction.get("user_id")
                plan = transaction.get("plan")
                months = SUBSCRIPTION_PLANS.get(plan, {}).get("months", 1)
                
                # Create/update subscription
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
                
                # Update transaction status
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "completed", "status": "completed"}}
                )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status
        }
        
    except Exception as e:
        logger.error(f"Error getting subscription status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}")
async def get_user_subscription(user_id: str):
    """Get user's subscription status."""
    subscription = await db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
    
    if not subscription:
        return {"has_subscription": False}
    
    # Check if subscription is still active
    end_date = subscription.get("end_date")
    if end_date:
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        if end_date < datetime.now(timezone.utc):
            subscription["is_active"] = False
    
    return {
        "has_subscription": True,
        "subscription": subscription
    }
