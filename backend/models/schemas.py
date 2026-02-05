"""
Pydantic models for the Rainbow Mates application.
"""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator
import uuid
import re


# ============= USER MODELS =============

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
    
    @field_validator('first_name')
    @classmethod
    def validate_first_name(cls, v):
        if not v or not v.strip():
            raise ValueError('First name is required')
        if len(v.strip()) < 2:
            raise ValueError('First name must be at least 2 characters')
        if len(v.strip()) > 50:
            raise ValueError('First name must be less than 50 characters')
        return v.strip()
    
    @field_validator('surname')
    @classmethod
    def validate_surname(cls, v):
        if not v or not v.strip():
            raise ValueError('Surname is required')
        if len(v.strip()) < 2:
            raise ValueError('Surname must be at least 2 characters')
        if len(v.strip()) > 50:
            raise ValueError('Surname must be less than 50 characters')
        return v.strip()
    
    @field_validator('dob')
    @classmethod
    def validate_dob(cls, v):
        if not v:
            raise ValueError('Date of birth is required')
        try:
            birth_date = datetime.strptime(v, '%Y-%m-%d')
            today = datetime.now()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            if age < 18:
                raise ValueError('You must be at least 18 years old')
            if age > 120:
                raise ValueError('Please enter a valid date of birth')
        except ValueError as e:
            if 'at least 18' in str(e) or 'valid date' in str(e):
                raise e
            raise ValueError('Invalid date format')
        return v
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not v:
            raise ValueError('Email is required')
        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, v):
            raise ValueError('Please enter a valid email address')
        return v.lower().strip()
    
    @field_validator('mobile')
    @classmethod
    def validate_mobile(cls, v):
        if not v:
            raise ValueError('Mobile number is required')
        cleaned = re.sub(r'[^\d+]', '', v)
        if not cleaned.startswith('+'):
            raise ValueError('Mobile must include country code (e.g., +44)')
        digits_only = cleaned[1:] if cleaned.startswith('+') else cleaned
        if len(digits_only) < 9 or len(digits_only) > 15:
            raise ValueError('Please enter a valid mobile number')
        return cleaned
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not v:
            raise ValueError('Password is required')
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        if len(v) > 100:
            raise ValueError('Password must be less than 100 characters')
        return v


class UserLogin(BaseModel):
    identifier: str  # email or mobile
    password: str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    surname: Optional[str] = None
    relationship_status: Optional[str] = None
    relationship_with: Optional[str] = None
    relationship_feel: Optional[str] = None
    avatar_url: Optional[str] = None


# ============= AUTH MODELS =============

class OTPVerify(BaseModel):
    identifier: str
    otp: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


class GoogleAuthCallback(BaseModel):
    session_token: str


# ============= AVATAR MODELS =============

class AvatarCreate(BaseModel):
    relationship_status: str
    relationship_with: str
    relationship_feel: str


class AvatarEdit(BaseModel):
    avatar_url: Optional[str] = None
    relationship_status: Optional[str] = None
    relationship_with: Optional[str] = None
    relationship_feel: Optional[str] = None


# ============= BESTIE MODELS =============

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


class BestieUpdate(BaseModel):
    name: Optional[str] = None
    personality: Optional[List[str]] = None
    interests: Optional[List[str]] = None


# ============= MESSAGE MODELS =============

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


# ============= SUBSCRIPTION MODELS =============

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


# ============= SHOPPING MODELS =============

class ShoppingRequest(BaseModel):
    bestie_id: str
    user_request: str
    gender: Optional[str] = "Female"
    style: Optional[str] = None
    length: Optional[str] = None
    max_price: Optional[float] = None
    brands: Optional[List[str]] = None


# ============= VOICE MODELS =============

class VoiceRequest(BaseModel):
    text: str
    bestie_id: str
