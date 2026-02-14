"""
Centralized error codes and exception handling.
"""
from enum import Enum
from typing import Optional, Dict, Any
from fastapi import HTTPException


class ErrorCode(str, Enum):
    """Application-specific error codes."""
    
    # Authentication errors (1xxx)
    AUTH_INVALID_CREDENTIALS = "AUTH_1001"
    AUTH_USER_NOT_VERIFIED = "AUTH_1002"
    AUTH_TOKEN_EXPIRED = "AUTH_1003"
    AUTH_TOKEN_INVALID = "AUTH_1004"
    AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_1005"
    
    # User errors (2xxx)
    USER_NOT_FOUND = "USER_2001"
    USER_EMAIL_EXISTS = "USER_2002"
    USER_MOBILE_EXISTS = "USER_2003"
    USER_INVALID_OTP = "USER_2004"
    USER_OTP_EXPIRED = "USER_2005"
    
    # Bestie errors (3xxx)
    BESTIE_NOT_FOUND = "BESTIE_3001"
    BESTIE_ALREADY_EXISTS = "BESTIE_3002"
    
    # Chat errors (4xxx)
    CHAT_MESSAGE_NOT_FOUND = "CHAT_4001"
    CHAT_GENERATION_FAILED = "CHAT_4002"
    
    # Voice errors (5xxx)
    VOICE_TTS_FAILED = "VOICE_5001"
    VOICE_STT_FAILED = "VOICE_5002"
    VOICE_API_NOT_CONFIGURED = "VOICE_5003"
    
    # Shopping errors (6xxx)
    SHOPPING_RECOMMENDATION_FAILED = "SHOP_6001"
    
    # Subscription errors (7xxx)
    SUBSCRIPTION_INVALID_PLAN = "SUB_7001"
    SUBSCRIPTION_PAYMENT_FAILED = "SUB_7002"
    SUBSCRIPTION_NOT_FOUND = "SUB_7003"
    
    # Validation errors (8xxx)
    VALIDATION_FAILED = "VAL_8001"
    VALIDATION_MISSING_FIELD = "VAL_8002"
    
    # Server errors (9xxx)
    SERVER_INTERNAL_ERROR = "SRV_9001"
    SERVER_DATABASE_ERROR = "SRV_9002"
    SERVER_EXTERNAL_SERVICE_ERROR = "SRV_9003"


class AppException(HTTPException):
    """Custom application exception with error codes."""
    
    def __init__(
        self,
        status_code: int,
        error_code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.error_code = error_code
        self.details = details
        super().__init__(
            status_code=status_code,
            detail={
                "error_code": error_code.value,
                "message": message,
                "details": details
            }
        )


# Convenience exception factories
class AuthError:
    @staticmethod
    def invalid_credentials():
        return AppException(401, ErrorCode.AUTH_INVALID_CREDENTIALS, "Invalid credentials")
    
    @staticmethod
    def not_verified():
        return AppException(401, ErrorCode.AUTH_USER_NOT_VERIFIED, "Please verify your account first")
    
    @staticmethod
    def token_expired():
        return AppException(401, ErrorCode.AUTH_TOKEN_EXPIRED, "Token has expired")
    
    @staticmethod
    def token_invalid():
        return AppException(401, ErrorCode.AUTH_TOKEN_INVALID, "Invalid token")


class UserError:
    @staticmethod
    def not_found():
        return AppException(404, ErrorCode.USER_NOT_FOUND, "User not found")
    
    @staticmethod
    def email_exists():
        return AppException(400, ErrorCode.USER_EMAIL_EXISTS, "Email already registered")
    
    @staticmethod
    def mobile_exists():
        return AppException(400, ErrorCode.USER_MOBILE_EXISTS, "Mobile already registered")
    
    @staticmethod
    def invalid_otp():
        return AppException(400, ErrorCode.USER_INVALID_OTP, "Invalid or expired OTP")


class BestieError:
    @staticmethod
    def not_found():
        return AppException(404, ErrorCode.BESTIE_NOT_FOUND, "Bestie not found")
    
    @staticmethod
    def already_exists():
        return AppException(400, ErrorCode.BESTIE_ALREADY_EXISTS, "User already has a bestie")


class ChatError:
    @staticmethod
    def message_not_found():
        return AppException(404, ErrorCode.CHAT_MESSAGE_NOT_FOUND, "Message not found")
    
    @staticmethod
    def generation_failed():
        return AppException(500, ErrorCode.CHAT_GENERATION_FAILED, "Failed to generate response")


class VoiceError:
    @staticmethod
    def tts_failed(detail: str = None):
        return AppException(500, ErrorCode.VOICE_TTS_FAILED, "Text-to-speech failed", {"detail": detail})
    
    @staticmethod
    def stt_failed(detail: str = None):
        return AppException(500, ErrorCode.VOICE_STT_FAILED, "Speech-to-text failed", {"detail": detail})
    
    @staticmethod
    def not_configured():
        return AppException(500, ErrorCode.VOICE_API_NOT_CONFIGURED, "Voice API not configured")


class SubscriptionError:
    @staticmethod
    def invalid_plan():
        return AppException(400, ErrorCode.SUBSCRIPTION_INVALID_PLAN, "Invalid subscription plan")
    
    @staticmethod
    def payment_failed():
        return AppException(500, ErrorCode.SUBSCRIPTION_PAYMENT_FAILED, "Payment processing failed")
