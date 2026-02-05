from .health import router as health_router
from .auth import router as auth_router, init_db as init_auth_db
from .user import router as user_router, init_db as init_user_db
from .bestie import router as bestie_router, init_db as init_bestie_db
from .chat import router as chat_router, init_db as init_chat_db

__all__ = [
    "health_router",
    "auth_router", "init_auth_db",
    "user_router", "init_user_db",
    "bestie_router", "init_bestie_db",
    "chat_router", "init_chat_db"
]

