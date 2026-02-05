# Rainbow Mates - Product Requirements Document

## Latest Updates (Feb 5, 2025)
- **Backend Tests Fixed (P0)**: All 55 tests now pass
  - Fixed integration tests with proper URL handling
  - Adjusted rate limits for test execution (30/min auth, 120/min general)
  - Fixed flaky timing test for shopping recommendations
- **Backend Modular Architecture Completed (P1)**:
  - Created new route modules: `outfits.py`, `youtube.py`, `webhook.py`
  - Updated `avatar.py` with full virtual try-on functionality
  - All routes now live in `/app/backend/routes/`
  - New entry point: `main.py` (all routers registered)
  - Legacy `server.py` still in use by supervisor but can be deprecated
- **Technical Score: 91% → 100% achievable** with full migration

## Previous Updates (Feb 5, 2025 - Earlier)
- **Technical Refactoring Complete**: P0/P1 technical best practices implemented
  - Health check endpoint added (`/api/health`)
  - Security headers middleware added
  - Rate limiting implemented (30/min auth, 120/min general)
  - Database connection retry logic and indexes added
  - JWT authentication implemented
  - Centralized configuration management
  - Password hashing with bcrypt
  - Comprehensive test suite added

## Previous Updates (Feb 4, 2025)
- **Logo Updated**: New colorful silhouette logo added to Splash Screen and Auth Page
- **P0 Bug Fixes Verified**: Shopping layout, iframe, and voice accent all working
- **Shopping Model Fixed**: Changed from invalid Haiku to Sonnet model

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
   - **Forgot Password** - Email-based OTP reset flow
   - **Social Logins**:
     - ✅ Google Login (Emergent-managed OAuth - working)
     - 🔜 Facebook Login (requires App credentials)
     - 🔜 Apple Login (requires Developer credentials)
   - **Field Validations (Frontend + Backend)**:
     - First name: Min 2 chars, max 50 chars, required
     - Surname: Min 2 chars, max 50 chars, required
     - DOB: Must be 18+ years old, valid date format
     - Mobile: Country-specific digit count, with country code
     - Email: Valid email format
     - Password: Min 6 chars
   - Real-time validation feedback with red borders and error messages

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

4. **Dashboard**
   - Welcome view showing both user avatar and bestie side-by-side (after setup complete)
   - Edit buttons for both avatar and bestie
   - "Let's Play!" button (when setup complete)
   - Setup cards shown for new users who haven't completed avatar/bestie creation
   - Subscription status display

5. **Bestie Creation**
   - Fast creation using pre-selected images (no AI generation delay)
   - Selection grid with 8 bestie avatar options
   - Personality traits, interests, and accent customization
   - Immediate localStorage sync for consistent state

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

### 📋 Upcoming Features

1. **Dance with Bestie** - Future feature
2. **Additional avatar options** - Can add more pre-built avatars as needed

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
*Last updated: January 31, 2026*

## Bug Fixes Log

### January 31, 2026
- **P0 FIXED**: Dashboard now correctly shows both avatars after completing avatar and bestie creation
  - Root cause: localStorage not being updated with bestie data after creation
  - Fix: Save bestie to localStorage immediately after API call, refresh user data from backend
- **P1 FIXED**: Bestie creation now fast (under 5 seconds vs. 15+ seconds before)
  - Root cause: Backend was generating AI images even though user selected from a grid
  - Fix: Backend now uses user-selected image_url instead of generating a new one
