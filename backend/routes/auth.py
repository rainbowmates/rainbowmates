"""
Authentication routes.
"""
import logging
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException

from models.schemas import UserCreate, UserLogin, OTPVerify, ForgotPasswordRequest, ResetPasswordRequest, GoogleAuthCallback
from services.user_service import UserService, prepare_for_mongo, parse_from_mongo
from utils.auth import create_access_token, create_refresh_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Will be set by main app
db = None

# Lazy import for Google Auth
EmergentGoogleAuth = None


def init_db(database):
    """Initialize database reference."""
    global db
    db = database


@router.post("/register")
async def register(user: UserCreate):
    """Register a new user."""
    user_service = UserService(db)
    
    # Check if email or mobile already exists
    if await user_service.email_exists(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await user_service.mobile_exists(user.mobile):
        raise HTTPException(status_code=400, detail="Mobile already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "id": user_id,
        "first_name": user.first_name,
        "surname": user.surname,
        "dob": user.dob,
        "mobile": user.mobile,
        "email": user.email.lower(),
        "password": user.password,
        "is_verified": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await user_service.create(user_doc)
    return {"message": "Registration successful. Please verify with OTP: 123456", "user_id": user_id}


@router.post("/verify-otp")
async def verify_otp(data: OTPVerify):
    """Verify OTP for registration."""
    # Hardcoded OTP for demo
    if data.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    user_service = UserService(db)
    user_doc = await user_service.get_by_identifier(data.identifier)
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    await user_service.verify(data.identifier)
    user_doc = await user_service.get_by_identifier(data.identifier)
    
    # Generate JWT tokens
    access_token = create_access_token(user_doc["id"])
    refresh_token = create_refresh_token(user_doc["id"])
    
    return {
        "message": "OTP verified successfully",
        "user": user_doc,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/login")
async def login(credentials: UserLogin):
    """User login."""
    user_service = UserService(db)
    user_doc = await user_service.validate_credentials(credentials.identifier, credentials.password)
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc.get('is_verified'):
        raise HTTPException(status_code=401, detail="Please verify your account first")
    
    # Generate JWT tokens
    access_token = create_access_token(user_doc["id"])
    refresh_token = create_refresh_token(user_doc["id"])
    
    return {
        "message": "Login successful",
        "user": user_doc,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset OTP."""
    user_service = UserService(db)
    user_doc = await user_service.get_by_email(request.email)
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="Email not found")
    
    # Store OTP (hardcoded for demo)
    otp_doc = {
        "email": request.email.lower(),
        "otp": "123456",
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    
    await db.password_reset_otps.delete_many({"email": request.email.lower()})
    await db.password_reset_otps.insert_one(otp_doc)
    
    return {"message": "Password reset OTP sent. Use: 123456"}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password with OTP."""
    # Verify OTP
    otp_doc = await db.password_reset_otps.find_one({
        "email": request.email.lower(),
        "otp": request.otp
    })
    
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Update password
    user_service = UserService(db)
    await user_service.update_password(request.email, request.new_password)
    
    # Clean up OTP
    await db.password_reset_otps.delete_many({"email": request.email.lower()})
    
    return {"message": "Password reset successful"}


@router.post("/google/callback")
async def google_auth_callback(data: GoogleAuthCallback):
    """Handle Google OAuth callback."""
    try:
        auth = EmergentGoogleAuth()
        google_user = auth.get_user_info(data.session_token)
        
        if not google_user or not google_user.get("email"):
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        
        user_service = UserService(db)
        existing_user = await user_service.get_by_email(google_user["email"])
        
        if existing_user:
            # Update existing user
            await db.users.update_one(
                {"email": google_user["email"]},
                {"$set": {
                    "name": google_user.get("name"),
                    "picture": google_user.get("picture"),
                    "google_id": google_user.get("id"),
                    "is_verified": True
                }}
            )
            user_doc = await user_service.get_by_email(google_user["email"])
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                "id": user_id,
                "email": google_user["email"],
                "name": google_user.get("name", ""),
                "first_name": google_user.get("name", "").split()[0] if google_user.get("name") else "",
                "surname": " ".join(google_user.get("name", "").split()[1:]) if google_user.get("name") else "",
                "picture": google_user.get("picture"),
                "google_id": google_user.get("id"),
                "is_verified": True,
                "created_at": datetime.now(timezone.utc),
                "auth_provider": "google"
            }
            await user_service.create(new_user)
            user_doc = await user_service.get_by_id(user_id)
        
        # Generate JWT tokens
        access_token = create_access_token(user_doc["id"])
        refresh_token = create_refresh_token(user_doc["id"])
        
        return {
            "user": user_doc,
            "session_token": google_user.get("session_token"),
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
        
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
