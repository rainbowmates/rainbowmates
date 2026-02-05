# Deployment Guide

## Deployment Options

### 1. Emergent Platform (Recommended)

The application is designed to run on Emergent's platform with automatic deployment.

**Features:**
- Automatic HTTPS
- MongoDB included
- Hot reload in preview
- One-click deployment

**Steps:**
1. Push code to repository
2. Click "Deploy" in Emergent dashboard
3. Configure environment variables
4. Access at `your-app.host.emergentagent.com`

### 2. Docker Deployment

#### Build Images

```dockerfile
# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

```dockerfile
# Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .

RUN yarn build

FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html
EXPOSE 80
```

#### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongo:27017
      - DB_NAME=rainbow_mates
    depends_on:
      - mongo

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      - REACT_APP_BACKEND_URL=http://backend:8001

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongo_data:
```

### 3. Cloud Providers

#### AWS (ECS/Fargate)

1. Push images to ECR
2. Create ECS cluster
3. Define task definition
4. Create ALB for load balancing
5. Configure environment variables in Secrets Manager

#### Google Cloud (Cloud Run)

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/rainbow-mates-backend
gcloud builds submit --tag gcr.io/PROJECT_ID/rainbow-mates-frontend

# Deploy
gcloud run deploy rainbow-mates-backend \
  --image gcr.io/PROJECT_ID/rainbow-mates-backend \
  --platform managed \
  --allow-unauthenticated
```

#### Heroku

```bash
# Backend
heroku create rainbow-mates-api
heroku config:set MONGO_URL=mongodb+srv://...
git push heroku main

# Frontend (separate app)
heroku create rainbow-mates-web
heroku config:set REACT_APP_BACKEND_URL=https://rainbow-mates-api.herokuapp.com
```

## Environment Configuration

### Production Settings

```bash
# Security
JWT_SECRET_KEY=<generate-strong-secret>
CORS_ORIGINS=https://yourdomain.com

# Database
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/rainbow_mates

# API Keys
EMERGENT_LLM_KEY=<production-key>
STRIPE_API_KEY=sk_live_<key>  # Use live key in production
ELEVENLABS_API_KEY=<production-key>

# App URL (for redirects)
APP_URL=https://yourdomain.com
```

### Security Checklist

- [ ] HTTPS enabled
- [ ] Strong JWT secret
- [ ] CORS restricted to your domain
- [ ] API keys are production keys
- [ ] Database has authentication
- [ ] Rate limiting enabled
- [ ] Security headers configured

## Database Migration

### Backup Production Data

```bash
mongodump --uri="$MONGO_URL" --out=backup/
```

### Restore Data

```bash
mongorestore --uri="$NEW_MONGO_URL" backup/
```

### Create Indexes (First Deploy)

The application auto-creates indexes on startup. Verify with:

```javascript
// In MongoDB shell
db.users.getIndexes()
db.besties.getIndexes()
db.chat_messages.getIndexes()
```

## Monitoring

### Health Checks

```bash
# Liveness
curl https://your-app.com/api/health/live

# Readiness
curl https://your-app.com/api/health/ready

# Full health
curl https://your-app.com/api/health
```

### Logs

**Emergent Platform:**
- View in dashboard → Logs

**Docker:**
```bash
docker logs -f rainbow-mates-backend
```

**Cloud:**
- AWS: CloudWatch Logs
- GCP: Cloud Logging
- Heroku: `heroku logs --tail`

## Scaling

### Horizontal Scaling

- Backend: Stateless, can scale horizontally
- Frontend: Static build, CDN recommended
- Database: Use MongoDB Atlas with auto-scaling

### Recommended Setup

| Traffic | Backend | Database |
|---------|---------|----------|
| <1K/day | 1 instance | M10 |
| 1K-10K/day | 2 instances | M20 |
| 10K+/day | Auto-scale | M30+ |

## Troubleshooting

### Blank Page After Deploy

1. Check frontend build completed
2. Verify `REACT_APP_BACKEND_URL` is set
3. Check for JavaScript errors in console

### API Errors

1. Check backend logs
2. Verify environment variables
3. Test database connectivity

### Payment Issues

1. Verify Stripe keys (test vs live)
2. Check webhook configuration
3. Verify redirect URLs

## Rollback

### Emergent Platform

Use "Rollback" button in dashboard to revert to previous version.

### Docker

```bash
# Tag previous version
docker tag rainbow-mates-backend:previous rainbow-mates-backend:latest

# Redeploy
docker-compose up -d
```

### Git-based

```bash
git revert HEAD
git push origin main
# Redeploy
```
