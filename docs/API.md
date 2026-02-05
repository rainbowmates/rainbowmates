# Rainbow Mates API Documentation

## Base URL

- **Preview**: `https://rainbow-buddies.preview.emergentagent.com/api`
- **Production**: `https://your-app.host.emergentagent.com/api`

## Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <access_token>
```

Tokens are returned on login/register and valid for 24 hours.

---

## Endpoints

### Health Check

#### GET `/health`
Full system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-02-05T12:00:00Z",
  "version": "1.0.0",
  "components": {
    "database": {"status": "healthy", "connected": true},
    "external_services": {
      "stripe": {"status": "healthy"},
      "elevenlabs": {"status": "healthy"}
    }
  }
}
```

#### GET `/health/live`
Kubernetes liveness probe.

#### GET `/health/ready`
Kubernetes readiness probe.

---

### Authentication

#### POST `/auth/register`
Register a new user.

**Request:**
```json
{
  "first_name": "Jane",
  "surname": "Doe",
  "email": "jane@example.com",
  "mobile": "+1234567890",
  "password": "securepassword",
  "dob": "1990-01-15"
}
```

**Response:**
```json
{
  "message": "Registration successful. Please verify with OTP: 123456",
  "user_id": "user_abc123"
}
```

#### POST `/auth/verify-otp`
Verify registration OTP.

**Request:**
```json
{
  "identifier": "jane@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "OTP verified successfully",
  "user": {...},
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

#### POST `/auth/login`
User login.

**Request:**
```json
{
  "identifier": "jane@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {...},
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

#### POST `/auth/forgot-password`
Request password reset.

**Request:**
```json
{
  "email": "jane@example.com"
}
```

#### POST `/auth/reset-password`
Reset password with OTP.

**Request:**
```json
{
  "email": "jane@example.com",
  "otp": "123456",
  "new_password": "newsecurepassword"
}
```

#### POST `/auth/google/callback`
Handle Google OAuth callback.

**Request:**
```json
{
  "session_token": "google_session_token"
}
```

---

### Users

#### GET `/user/{user_id}`
Get user profile.

#### PUT `/user/update/{user_id}`
Update user profile.

**Request:**
```json
{
  "first_name": "Jane",
  "surname": "Smith",
  "avatar_url": "https://..."
}
```

#### DELETE `/user/delete/{user_id}`
Delete user account.

---

### Bestie

#### POST `/bestie/create?user_id={user_id}`
Create a bestie for user.

**Request:**
```json
{
  "name": "Alex",
  "image_url": "https://example.com/avatar.png",
  "personality": ["supportive", "fun", "sassy"],
  "interests": ["fashion", "music"],
  "accent": "British"
}
```

#### GET `/bestie/{user_id}`
Get user's bestie.

#### PUT `/bestie/{bestie_id}`
Update bestie.

---

### Chat

#### POST `/chat/message?user_id={user_id}`
Send message to bestie.

**Request:**
```json
{
  "bestie_id": "bestie_abc123",
  "content": "Hey bestie, how are you?"
}
```

**Response:**
```json
{
  "user_message": {
    "id": "msg_123",
    "content": "Hey bestie, how are you?",
    "role": "user"
  },
  "bestie_response": {
    "id": "msg_124",
    "content": "Hey honey! I'm fabulous, thanks for asking! How are YOU doing today?",
    "role": "bestie"
  }
}
```

#### GET `/chat/history/{user_id}/{bestie_id}`
Get chat history.

**Query Parameters:**
- `limit` (optional): Max messages (default: 50)

#### DELETE `/chat/history/{user_id}/{bestie_id}`
Clear all chat history.

#### DELETE `/chat/message/{user_id}/{bestie_id}/{message_id}`
Delete specific message.

---

### Voice

#### POST `/voice/tts?bestie_id={bestie_id}&text={text}`
Convert text to speech.

**Response:**
```json
{
  "audio_url": "data:audio/mpeg;base64,..."
}
```

#### POST `/voice/stt`
Convert speech to text.

**Request:** `multipart/form-data` with `audio_file`

**Response:**
```json
{
  "text": "Transcribed text here"
}
```

---

### Shopping

#### POST `/shopping/recommendations?user_id={user_id}`
Get shopping recommendations.

**Request:**
```json
{
  "bestie_id": "bestie_abc123",
  "user_request": "Find me a dress for a cocktail party",
  "max_price": 200,
  "style": "elegant"
}
```

**Response:**
```json
{
  "recommendations": "Here are some fabulous options...",
  "followup_question": "Which vibe are you feeling?"
}
```

---

### Avatar

#### POST `/avatar/create/{user_id}`
Create/select avatar.

**Request:**
```json
{
  "relationship_status": "single",
  "relationship_with": "men",
  "relationship_feel": "happy"
}
```

#### PUT `/avatar/edit/{user_id}`
Edit avatar settings.

#### GET `/avatar/{user_id}`
Get avatar data.

---

### Subscription

#### POST `/subscription/create?user_id={user_id}`
Create subscription checkout.

**Request:**
```json
{
  "plan": "1_month",
  "auto_renew": false
}
```

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_123"
}
```

**Plans:**
- `1_month`: $9.99
- `3_months`: $24.99
- `6_months`: $39.99

#### GET `/subscription/status/{session_id}`
Check payment status.

#### GET `/subscription/{user_id}`
Get user's subscription.

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Error description"
  },
  "data": null
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 404 | Not Found - Resource doesn't exist |
| 422 | Validation Error - Invalid data format |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error - Internal error |

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Auth endpoints | 5/minute |
| General endpoints | 60/minute |

Headers returned:
- `X-RateLimit-Limit`: Max requests
- `X-RateLimit-Remaining`: Remaining requests

---

## Webhooks

### Stripe Webhook

Configure Stripe to send events to:
```
POST /api/webhooks/stripe
```

Supported events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
