# Rainbow Mates 🌈

A web application for creating and interacting with a virtual gay best friend ("bestie").

## Tech Stack

- **Frontend**: React, Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI/ML**: Claude Sonnet (chat), ElevenLabs (TTS), OpenAI Whisper (STT)
- **Payments**: Stripe
- **Auth**: JWT + Google OAuth

## Project Structure

```
/app/
├── backend/
│   ├── config/           # Configuration management
│   │   ├── settings.py   # Centralized settings
│   │   └── database.py   # Database connection with retry
│   ├── middleware/       # FastAPI middleware
│   │   ├── security.py   # Security headers
│   │   ├── rate_limit.py # Rate limiting
│   │   └── error_handler.py
│   ├── models/           # Pydantic schemas
│   │   └── schemas.py    # All data models
│   ├── routes/           # API route handlers
│   │   ├── health.py     # Health check endpoints
│   │   ├── auth.py       # Authentication
│   │   ├── user.py       # User management
│   │   ├── bestie.py     # Bestie operations
│   │   └── chat.py       # Chat functionality
│   ├── services/         # Business logic layer
│   │   ├── user_service.py
│   │   ├── bestie_service.py
│   │   └── chat_service.py
│   ├── utils/            # Utility functions
│   │   ├── auth.py       # JWT utilities
│   │   └── responses.py  # Standardized responses
│   ├── server.py         # Main application (legacy)
│   ├── main.py           # New modular entry point
│   └── requirements.txt
└── frontend/
    ├── public/
    └── src/
        ├── components/
        ├── pages/
        └── App.js
```

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- MongoDB

### Backend Setup

```bash
cd /app/backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables (see .env.example)
cp .env.example .env

# Run server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
cd /app/frontend

# Install dependencies
yarn install

# Start development server
yarn start
```

## API Endpoints

### Health Check
- `GET /api/health` - Full system health status
- `GET /api/health/live` - Liveness probe
- `GET /api/health/ready` - Readiness probe

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with OTP
- `POST /api/auth/google/callback` - Google OAuth callback

### Users
- `GET /api/user/{user_id}` - Get user profile
- `PUT /api/user/update/{user_id}` - Update profile
- `DELETE /api/user/delete/{user_id}` - Delete account

### Bestie
- `POST /api/bestie/create` - Create bestie
- `GET /api/bestie/{user_id}` - Get user's bestie
- `PUT /api/bestie/{bestie_id}` - Update bestie

### Chat
- `POST /api/chat/message` - Send message
- `GET /api/chat/history/{user_id}/{bestie_id}` - Get chat history
- `DELETE /api/chat/history/{user_id}/{bestie_id}` - Clear history
- `DELETE /api/chat/message/{user_id}/{bestie_id}/{message_id}` - Delete message

### Voice
- `POST /api/voice/tts` - Text to speech
- `POST /api/voice/stt` - Speech to text

### Shopping
- `POST /api/shopping/recommendations` - Get shopping recommendations

### Subscription
- `POST /api/subscription/create` - Create subscription
- `GET /api/subscription/status/{session_id}` - Check payment status
- `GET /api/subscription/{user_id}` - Get user subscription

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URL` | MongoDB connection string | Yes |
| `DB_NAME` | Database name | Yes |
| `EMERGENT_LLM_KEY` | Emergent API key for LLM | Yes |
| `STRIPE_API_KEY` | Stripe API key | Yes |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | Yes |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | No |
| `JWT_SECRET_KEY` | Secret for JWT signing | No |

## Security Features

- **Security Headers**: X-Frame-Options, X-XSS-Protection, CSP, etc.
- **Rate Limiting**: 5/min for auth, 60/min for general
- **JWT Authentication**: Access and refresh tokens
- **Input Validation**: Pydantic validators on all inputs

## Testing

```bash
cd /app/backend

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=. --cov-report=html
```

## Development Notes

- OTP is hardcoded to `123456` for development
- Test credentials are available for Stripe in preview environment
- Virtual Try-On feature is blocked due to Google Cloud quota

## License

Proprietary - All rights reserved
