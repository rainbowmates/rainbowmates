"""
Standardized response utilities.
"""
from typing import Any, Optional, Dict
from fastapi.responses import JSONResponse


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200
) -> JSONResponse:
    """
    Create a standardized success response.
    
    Args:
        data: Response data
        message: Success message
        status_code: HTTP status code
        
    Returns:
        JSONResponse with standardized format
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": data,
            "error": None
        }
    )


def error_response(
    message: str,
    status_code: int = 400,
    error_code: Optional[str] = None,
    details: Optional[Dict] = None
) -> JSONResponse:
    """
    Create a standardized error response.
    
    Args:
        message: Error message
        status_code: HTTP status code
        error_code: Application-specific error code
        details: Additional error details
        
    Returns:
        JSONResponse with standardized format
    """
    error_info = {
        "code": status_code,
        "message": message
    }
    
    if error_code:
        error_info["error_code"] = error_code
    if details:
        error_info["details"] = details
    
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "data": None,
            "error": error_info
        }
    )


# Common error messages
class ErrorMessages:
    """Centralized error messages to avoid duplication."""
    
    USER_NOT_FOUND = "User not found"
    BESTIE_NOT_FOUND = "Bestie not found"
    INVALID_CREDENTIALS = "Invalid credentials"
    EMAIL_EXISTS = "Email already registered"
    MOBILE_EXISTS = "Mobile number already registered"
    INVALID_OTP = "Invalid or expired OTP"
    MISSING_FIELDS = "Missing required fields"
    UNAUTHORIZED = "Unauthorized access"
    RATE_LIMITED = "Too many requests. Please try again later."
    SERVER_ERROR = "Internal server error"
    DATABASE_ERROR = "Database operation failed"
    VALIDATION_ERROR = "Validation error"
