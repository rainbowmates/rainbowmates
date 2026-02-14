"""
Rate limiting middleware for FastAPI.
"""
import time
from collections import defaultdict
from typing import Dict, Tuple
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from config.settings import settings


class RateLimiter:
    """
    Simple in-memory rate limiter.
    For production, use Redis-based rate limiting.
    """
    
    def __init__(self):
        # Store: {client_ip: {endpoint: [(timestamp, count)]}}
        self._requests: Dict[str, Dict[str, list]] = defaultdict(lambda: defaultdict(list))
        self._cleanup_interval = 60  # Clean up old entries every 60 seconds
        self._last_cleanup = time.time()
    
    def _cleanup_old_entries(self):
        """Remove entries older than 1 minute."""
        current_time = time.time()
        if current_time - self._last_cleanup < self._cleanup_interval:
            return
            
        cutoff = current_time - 60
        for ip in list(self._requests.keys()):
            for endpoint in list(self._requests[ip].keys()):
                self._requests[ip][endpoint] = [
                    ts for ts in self._requests[ip][endpoint] if ts > cutoff
                ]
                if not self._requests[ip][endpoint]:
                    del self._requests[ip][endpoint]
            if not self._requests[ip]:
                del self._requests[ip]
        
        self._last_cleanup = current_time
    
    def is_rate_limited(self, client_ip: str, endpoint: str, limit: int) -> Tuple[bool, int]:
        """
        Check if request should be rate limited.
        
        Args:
            client_ip: Client IP address
            endpoint: API endpoint category
            limit: Maximum requests per minute
            
        Returns:
            Tuple of (is_limited, remaining_requests)
        """
        self._cleanup_old_entries()
        
        current_time = time.time()
        cutoff = current_time - 60
        
        # Get requests in last minute
        recent_requests = [
            ts for ts in self._requests[client_ip][endpoint] if ts > cutoff
        ]
        self._requests[client_ip][endpoint] = recent_requests
        
        if len(recent_requests) >= limit:
            return True, 0
        
        # Record this request
        self._requests[client_ip][endpoint].append(current_time)
        return False, limit - len(recent_requests) - 1


# Global rate limiter instance
rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces rate limiting on API endpoints.
    """
    
    # Endpoints with stricter rate limits
    AUTH_ENDPOINTS = {"/api/auth/register", "/api/auth/login", "/api/auth/forgot-password", "/api/auth/reset-password"}
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Get forwarded IP if behind proxy
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        # Determine rate limit based on endpoint
        path = request.url.path
        
        if path in self.AUTH_ENDPOINTS:
            limit = settings.RATE_LIMIT_AUTH
            endpoint_type = "auth"
        else:
            limit = settings.RATE_LIMIT_GENERAL
            endpoint_type = "general"
        
        # Check rate limit
        is_limited, remaining = rate_limiter.is_rate_limited(client_ip, endpoint_type, limit)
        
        if is_limited:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": "60"}
            )
        
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        
        return response
