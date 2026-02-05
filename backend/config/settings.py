"""
Centralized configuration management using environment variables.
"""
import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')


class Settings:
    """Application settings loaded from environment variables."""
    
    # App Settings
    APP_NAME: str = "Rainbow Mates"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    APP_URL: str = os.getenv("APP_URL", "")
    
    # Database
    MONGO_URL: str = os.getenv("MONGO_URL", "")
    DB_NAME: str = os.getenv("DB_NAME", "rainbow_mates")
    
    # CORS
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
    
    # API Keys
    EMERGENT_LLM_KEY: str = os.getenv("EMERGENT_LLM_KEY", "")
    STRIPE_API_KEY: str = os.getenv("STRIPE_API_KEY", "")
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    
    # Google Cloud
    GOOGLE_CLOUD_PROJECT: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    
    # JWT Settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Rate Limiting
    RATE_LIMIT_AUTH: int = 5  # requests per minute for auth endpoints
    RATE_LIMIT_GENERAL: int = 60  # requests per minute for general endpoints
    
    # Paths
    ROOT_DIR: Path = ROOT_DIR
    OUTFITS_DIR: Path = ROOT_DIR / "outfits"
    
    @classmethod
    def validate(cls) -> List[str]:
        """Validate required settings and return list of missing ones."""
        missing = []
        if not cls.MONGO_URL:
            missing.append("MONGO_URL")
        if not cls.EMERGENT_LLM_KEY:
            missing.append("EMERGENT_LLM_KEY")
        return missing


# Singleton instance
settings = Settings()
