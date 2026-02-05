"""
Rainbow Mates API - Main Application Entry Point

This is the main FastAPI application file. It imports routes from modular files
and sets up middleware, database connections, and application lifecycle events.
"""
import os
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

# Add backend directory to path
ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / '.env')

# Import configuration
from config.settings import settings
from config.database import db_manager

# Import middleware
from middleware.security import SecurityHeadersMiddleware
from middleware.rate_limit import RateLimitMiddleware

# Import routes
from routes import (
    health_router,
    auth_router, init_auth_db,
    user_router, init_user_db,
    bestie_router, init_bestie_db,
    chat_router, init_chat_db,
    voice_router, init_voice_db,
    shopping_router, init_shopping_db,
    subscription_router, init_subscription_db,
    avatar_router, init_avatar_db
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting Rainbow Mates API...")
    
    # Validate settings
    missing = settings.validate()
    if missing:
        logger.warning(f"Missing environment variables: {missing}")
    
    # Connect to database
    connected = await db_manager.connect(max_retries=3)
    if connected:
        logger.info("Database connection established")
        
        # Initialize route database references
        db = db_manager.get_db()
        init_auth_db(db)
        init_user_db(db)
        init_bestie_db(db)
        init_chat_db(db)
        init_voice_db(db)
        init_shopping_db(db)
        init_subscription_db(db)
        init_avatar_db(db)
    else:
        logger.error("Failed to connect to database on startup")
    
    yield
    
    # Shutdown
    await db_manager.disconnect()
    logger.info("Rainbow Mates API shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Rainbow Mates API",
    description="API for Rainbow Mates - Your Virtual Gay Best Friend",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Include routers
app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(bestie_router, prefix="/api")
app.include_router(chat_router, prefix="/api")

# Add middleware (order matters - last added is first executed)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
