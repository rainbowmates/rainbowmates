"""
Health check endpoints for monitoring.
"""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter
import httpx

from config.settings import settings
from config.database import db_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
@router.get("/")
async def health_check():
    """
    Basic health check endpoint.
    Returns overall system health status.
    """
    # Check database
    db_health = await db_manager.health_check()
    
    # Check external services
    external_services = await check_external_services()
    
    # Determine overall status
    all_healthy = db_health["status"] == "healthy" and all(
        svc["status"] == "healthy" for svc in external_services.values()
    )
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.APP_VERSION,
        "components": {
            "database": db_health,
            "external_services": external_services
        }
    }


@router.get("/live")
async def liveness_check():
    """
    Kubernetes liveness probe.
    Returns 200 if the service is running.
    """
    return {"status": "alive", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/ready")
async def readiness_check():
    """
    Kubernetes readiness probe.
    Returns 200 if the service is ready to accept traffic.
    """
    db_health = await db_manager.health_check()
    
    if db_health["status"] != "healthy":
        return {
            "status": "not_ready",
            "reason": "Database not connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    return {
        "status": "ready",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


async def check_external_services() -> dict:
    """
    Check health of external services.
    """
    services = {}
    
    # Check Stripe
    services["stripe"] = await check_stripe_health()
    
    # Check ElevenLabs
    services["elevenlabs"] = await check_elevenlabs_health()
    
    return services


async def check_stripe_health() -> dict:
    """Check Stripe API availability."""
    if not settings.STRIPE_API_KEY:
        return {"status": "unconfigured", "message": "API key not set"}
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://api.stripe.com/v1/balance",
                headers={"Authorization": f"Bearer {settings.STRIPE_API_KEY}"}
            )
            if response.status_code == 200:
                return {"status": "healthy", "message": "Connected"}
            else:
                return {"status": "degraded", "message": f"Status code: {response.status_code}"}
    except Exception as e:
        logger.warning(f"Stripe health check failed: {e}")
        return {"status": "unhealthy", "message": str(e)}


async def check_elevenlabs_health() -> dict:
    """Check ElevenLabs API availability."""
    if not settings.ELEVENLABS_API_KEY:
        return {"status": "unconfigured", "message": "API key not set"}
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/user",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY}
            )
            if response.status_code == 200:
                return {"status": "healthy", "message": "Connected"}
            else:
                return {"status": "degraded", "message": f"Status code: {response.status_code}"}
    except Exception as e:
        logger.warning(f"ElevenLabs health check failed: {e}")
        return {"status": "unhealthy", "message": str(e)}
