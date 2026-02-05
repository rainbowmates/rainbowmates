"""
Database connection management with error handling, retry logic, and indexing.
"""
import asyncio
import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from config.settings import settings

logger = logging.getLogger(__name__)


class Database:
    """Database connection manager with retry logic and health checks."""
    
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    _initialized: bool = False
    
    @classmethod
    async def connect(cls, max_retries: int = 3, retry_delay: float = 1.0) -> bool:
        """
        Connect to MongoDB with retry logic.
        
        Args:
            max_retries: Maximum number of connection attempts
            retry_delay: Delay between retries in seconds
            
        Returns:
            True if connection successful, False otherwise
        """
        if not settings.MONGO_URL:
            logger.error("MONGO_URL environment variable is not set")
            return False
            
        for attempt in range(max_retries):
            try:
                cls.client = AsyncIOMotorClient(
                    settings.MONGO_URL,
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=5000,
                    maxPoolSize=50,
                    minPoolSize=10
                )
                
                # Test connection
                await cls.client.admin.command('ping')
                cls.db = cls.client[settings.DB_NAME]
                
                logger.info(f"Successfully connected to MongoDB database: {settings.DB_NAME}")
                
                # Create indexes on successful connection
                await cls.create_indexes()
                cls._initialized = True
                return True
                
            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                logger.warning(f"MongoDB connection attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * (attempt + 1))  # Exponential backoff
                    
            except Exception as e:
                logger.error(f"Unexpected error connecting to MongoDB: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                else:
                    return False
                    
        logger.error("Failed to connect to MongoDB after all retries")
        return False
    
    @classmethod
    async def disconnect(cls):
        """Close database connection."""
        if cls.client is not None:
            cls.client.close()
            cls._initialized = False
            logger.info("Disconnected from MongoDB")
    
    @classmethod
    async def create_indexes(cls):
        """Create indexes for frequently queried fields."""
        if cls.db is None:
            return
            
        try:
            # Users collection indexes
            await cls.db.users.create_index("id", unique=True)
            await cls.db.users.create_index("email", unique=True, sparse=True)
            await cls.db.users.create_index("mobile", sparse=True)
            
            # Besties collection indexes
            await cls.db.besties.create_index("id", unique=True)
            await cls.db.besties.create_index("user_id")
            
            # Chat messages indexes
            await cls.db.chat_messages.create_index([("user_id", 1), ("bestie_id", 1)])
            await cls.db.chat_messages.create_index("timestamp")
            await cls.db.chat_messages.create_index("message_id", unique=True)
            
            # Subscriptions indexes
            await cls.db.subscriptions.create_index("user_id", unique=True)
            await cls.db.subscriptions.create_index("stripe_subscription_id", sparse=True)
            
            # Password reset OTPs
            await cls.db.password_reset_otps.create_index("email")
            await cls.db.password_reset_otps.create_index("expires_at", expireAfterSeconds=0)
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")
    
    @classmethod
    async def health_check(cls) -> dict:
        """
        Check database health status.
        
        Returns:
            Dictionary with health status information
        """
        if cls.client is None or not cls._initialized:
            return {
                "status": "unhealthy",
                "message": "Database not connected",
                "connected": False
            }
            
        try:
            await cls.client.admin.command('ping')
            return {
                "status": "healthy",
                "message": "Database connected",
                "connected": True,
                "database": settings.DB_NAME
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "message": str(e),
                "connected": False
            }
    
    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        """Get database instance."""
        if cls.db is None:
            raise RuntimeError("Database not initialized. Call Database.connect() first.")
        return cls.db


# Convenience function for getting db
def get_db() -> AsyncIOMotorDatabase:
    """Get database instance."""
    return Database.get_db()


# Export
db_manager = Database
