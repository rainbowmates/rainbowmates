# Development Setup Guide

## Prerequisites

- Python 3.9+
- Node.js 18+
- MongoDB 5.0+
- Git

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd rainbow-mates
```

### 2. Backend Setup

```bash
cd /app/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your values (see Environment Variables below)
nano .env
```

### 3. Frontend Setup

```bash
cd /app/frontend

# Install dependencies
yarn install

# Create environment file
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
```

### 4. Start Services

**Terminal 1 - Backend:**
```bash
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd /app/frontend
yarn start
```

### 5. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api
- API Docs: http://localhost:8001/docs

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Database name | `rainbow_mates` |
| `EMERGENT_LLM_KEY` | Emergent API key for AI | `em_xxxx` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `STRIPE_API_KEY` | Stripe API key | - |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS key | - |
| `JWT_SECRET_KEY` | JWT signing secret | Auto-generated |
| `CORS_ORIGINS` | Allowed origins | `*` |

## Database Setup

### Local MongoDB

```bash
# Install MongoDB (macOS)
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify connection
mongosh
```

### MongoDB Atlas (Cloud)

1. Create account at https://cloud.mongodb.com
2. Create a cluster
3. Get connection string
4. Add to `.env`: `MONGO_URL=mongodb+srv://...`

## Running Tests

```bash
cd /app/backend

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=. --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v
```

## Code Style

### Backend (Python)

```bash
# Format code
black .

# Lint
ruff check .

# Type check
mypy .
```

### Frontend (JavaScript)

```bash
# Lint
yarn lint

# Format
yarn format
```

## Common Issues

### MongoDB Connection Failed

- Ensure MongoDB is running: `brew services list`
- Check connection string format
- Verify network access (Atlas)

### ElevenLabs Voice Not Working

- Verify API key is set
- Check API key has credits
- Voice ID must be valid

### Stripe Payments Not Working

- Use test API keys for development
- Ensure webhook endpoints are configured

## Hot Reload

Both frontend and backend support hot reload:
- **Backend**: Changes to `.py` files auto-reload
- **Frontend**: Changes to `.jsx/.js` files auto-reload

Restart required for:
- `.env` changes
- New package installations
- Configuration changes

## Development Tools

### Recommended VSCode Extensions

- Python
- ESLint
- Prettier
- MongoDB for VS Code
- Thunder Client (API testing)

### Useful Commands

```bash
# Check backend logs
tail -f /var/log/supervisor/backend.err.log

# Check frontend logs
tail -f /var/log/supervisor/frontend.err.log

# Restart services
sudo supervisorctl restart backend frontend

# Database shell
mongosh $MONGO_URL
```
