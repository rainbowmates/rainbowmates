from .health import router as health_router
from .auth import router as auth_router, init_db as init_auth_db
from .user import router as user_router, init_db as init_user_db
from .bestie import router as bestie_router, init_db as init_bestie_db
from .chat import router as chat_router, init_db as init_chat_db
from .voice import router as voice_router, init_db as init_voice_db
from .shopping import router as shopping_router, init_db as init_shopping_db
from .subscription import router as subscription_router, init_db as init_subscription_db
from .avatar import router as avatar_router, init_db as init_avatar_db

__all__ = [
    "health_router",
    "auth_router", "init_auth_db",
    "user_router", "init_user_db",
    "bestie_router", "init_bestie_db",
    "chat_router", "init_chat_db",
    "voice_router", "init_voice_db",
    "shopping_router", "init_shopping_db",
    "subscription_router", "init_subscription_db",
    "avatar_router", "init_avatar_db"
]

