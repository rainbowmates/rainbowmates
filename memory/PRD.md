# Rainbow Mates - Product Requirements Document

## Overview
Rainbow Mates is a web application for women to create a virtual gay best friend ("bestie"). Users can upload their photo, customize their avatar with filters and outfits, and interact with an AI-powered companion through chat and voice features.

## Tech Stack
- **Frontend**: React, Tailwind CSS
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **3rd Party APIs**:
  - Google Vertex AI Virtual Try-On (blocked by quota)
  - ElevenLabs (TTS)
  - OpenAI Whisper (STT)
  - Claude Sonnet / LiteLLM (AI chat)
  - Stripe (payments)

## Core Features

### ✅ Completed Features

1. **User Authentication**
   - Registration with email, mobile, name, DOB
   - Login with email/mobile
   - OTP verification (hardcoded: 123456)
   - UK as default country, 18+ age verification

2. **Avatar Selection (Simplified)**
   - Step 1: Choose from 5 pre-built avatar options (Priya, Sofia, Maya, Yuki, Luna)
   - Step 2: "About You" form
   - Selected avatar preview shown in Step 2

3. **About You Form**
   - **Relationship Status**: Image-based popup selector with 5 options
     - Single, Married, Separated or Divorced
     - Open Relationship with Men, Open Relationship with Men & Women
   - **Relationship With**: Image-based popup selector with 4 options
     - Men, Women, Myself, Bisexual
   - **How does it feel?**: Dropdown (Fun, Boring, Coming to an end, Rather not say)

5. **AI Bestie Chat**
   - Detailed emotional intelligence prompts
   - Typing indicator (shows after user submits)
   - Context-aware responses

6. **Voice Features**
   - ElevenLabs TTS (accent-based voice mapping)
   - OpenAI Whisper STT

7. **Payments**
   - Stripe integration for subscriptions

8. **Mobile Responsiveness**
   - Fixed viewport issues resolved
   - Scrollable layouts on all pages

### 🚫 Blocked Features

1. **Virtual Try-On (Google Vertex AI)**
   - Status: BLOCKED by Google Cloud quota
   - User action required: Request quota increase for `virtual-try-on-001`
   - All technical implementation complete
   - App gracefully handles with "Service Temporarily Busy" message

### 📋 Upcoming Features

1. **Dance with Bestie** - Dependent on Virtual Try-On

## Key Files

- `/app/backend/server.py` - All backend logic
- `/app/frontend/src/pages/CreateAvatar.jsx` - Avatar creation flow
- `/app/frontend/src/pages/ChatScreen.jsx` - Chat interface
- `/app/frontend/src/pages/AuthPage.jsx` - Authentication

## Test Credentials
- Email: testuser789@test.com
- Password: Test123!
- OTP: 123456

---
*Last updated: January 30, 2026*
