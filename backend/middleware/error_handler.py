"""
Global error handling middleware for FastAPI.
"""
import logging
import traceback
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import ValidationError

logger = logging.getLogger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Middleware that catches all exceptions and returns standardized error responses.
    """
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
            
        except HTTPException as e:
            # Let HTTP exceptions pass through with standard format
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "success": False,
                    "error": {
                        "code": e.status_code,
                        "message": e.detail
                    },
                    "data": None
                }
            )
            
        except ValidationError as e:
            # Pydantic validation errors
            logger.warning(f"Validation error: {e}")
            return JSONResponse(
                status_code=422,
                content={
                    "success": False,
                    "error": {
                        "code": 422,
                        "message": "Validation error",
                        "details": e.errors()
                    },
                    "data": None
                }
            )
            
        except Exception as e:
            # Unexpected errors
            logger.error(f"Unhandled exception: {e}\n{traceback.format_exc()}")
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": {
                        "code": 500,
                        "message": "Internal server error"
                    },
                    "data": None
                }
            )
