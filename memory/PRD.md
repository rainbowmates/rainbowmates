# Rainbow Mates - Product Requirements Document

## Original Problem Statement
Rainbow Mates is a mobile-first application for creating a virtual gay best friend ("Bestie") to chat with.

## What's Been Implemented

### Feb 15, 2026 - Multi-lingual TTS (COMPLETE)
**Tom now speaks in the user's selected language:**
- English (en) - uses `eleven_turbo_v2_5` (faster model)
- French (fr) - uses `eleven_multilingual_v2`
- Italian (it) - uses `eleven_multilingual_v2`
- German (de) - uses `eleven_multilingual_v2`
- Spanish (es) - uses `eleven_multilingual_v2`
- Portuguese (pt) - uses `eleven_multilingual_v2`

**Technical Implementation:**
- Added `language` parameter to `/api/avatar/speak` endpoint
- Updated `StreamingTTSService.generate_speech()` to select model based on language
- Frontend passes current language from `useLanguage()` context
- Same Daniel voice speaks in all languages (ElevenLabs multilingual capability)

### Feb 15, 2026 - AI Safety Guardrails (COMPLETE)
**Implemented behavioral guardrails to ensure responsible AI behavior:**
1. **No Inappropriate Content**: AI politely refuses sexual or explicit conversation requests
   - Example response: "Okay babe, that's not really my vibe 😅 Let's talk about something else"
2. **No Major Life Advice**: AI avoids giving definitive advice on life-changing decisions (job changes, breakups, medical/legal matters)
   - Encourages user to consult trusted friends, family, or professionals
   - Example response: "That's HUGE - have you talked to someone you trust about this?"

**Technical Implementation:**
- Added `BEHAVIORAL GUARDRAILS` section to `CORE_IDENTITY_BLUEPRINT` in `backend/utils/prompts.py`
- Guardrails are part of the system prompt, not hardcoded responses

### Feb 15, 2026 - Multi-lingual AI Responses (COMPLETE)
**Tom now responds in user's selected language (text only):**
- English (en) - default
- French (fr) - "Salut chérie!" / "ma belle"
- Italian (it) - "Ciao tesoro!" / "bella"
- German (de) - "Hallo Liebling!" / "Schatz"
- Spanish (es) - "¡Hola cariño!" / "guapa"
- Portuguese (pt) - "Olá linda!" / "querida"

**Technical Implementation:**
- Added `language` parameter to `/api/chat/message` and `/api/chat/starter` endpoints
- Updated `get_bestie_system_prompt()` with language-specific instructions
- Updated `get_conversation_starter_prompt()` with language-specific greetings
- Frontend passes `language` from `useLanguage()` context to all chat API calls
- Expression tags remain in English for consistent parsing

**Note:** TTS (voice) remains in English. This is text-only multi-lingual support.

### Feb 15, 2026 - UI Translations Extended (COMPLETE)
**Extended UI translations to cover all remaining hardcoded text:**
- Dashboard: "You", "Premium Active", "Subscribe to Play", welcome messages
- Avatar Chat: "Loading Tom...", "Tom is thinking...", "replies left", input placeholder
- Subscription: "Processing payment...", "Free Subscription", "Coming Soon"
- Create Bestie: Name placeholder
- Settings: Mood history labels, delete account confirmation
- Auth Callback: Login progress messages
- Date or Mate: "Previous Discussions", "New Person"
- Play Screen: Feature titles and descriptions, subscription badge

**Files Updated:**
- `/app/frontend/src/utils/translations.js` - Added 30+ new translation keys
- `/app/frontend/src/pages/Dashboard.jsx`
- `/app/frontend/src/pages/AvatarChatScreen.jsx`
- `/app/frontend/src/pages/SubscriptionScreen.jsx`
- `/app/frontend/src/pages/CreateBestie.jsx`
- `/app/frontend/src/pages/SettingsScreen.jsx`
- `/app/frontend/src/pages/AuthCallback.jsx`
- `/app/frontend/src/pages/DateOrMateScreen.jsx`
- `/app/frontend/src/pages/PlayScreen.jsx`

### Feb 15, 2026 - UI Translations (COMPLETE)
- All UI text translated for 6 languages
- Translation file: `/app/frontend/src/utils/translations.js`
- LanguageProvider wraps entire app including splash/intro screens

### Feb 15, 2026 - Dynamic Avatar Expressions (COMPLETE)
**8 Core Expression States:**
1. SOFT_COMFORTING - Soft blue glow, gentle eyes
2. PLAYFUL_TEASING - Pink glow, asymmetric smirk
3. DRAMATIC_DISBELIEF - Gold glow, wide eyes
4. PROTECTIVE_SERIOUS - Steel blue glow, firm expression
5. CURIOUS_LEAN_IN - Green glow, raised brows (default)
6. EXCITED_SPARKLE - Bright gold glow, sparkle effect
7. TEASING_EYEROLL - Light pink, eye roll animation
8. GENTLE_CONCERN - Pale blue glow, soft expression

### Feb 15, 2026 - Talking Avatar Feature (COMPLETE)
- Single character "Tom" with 2.5D talking avatar
- Web Audio API lip-sync
- ElevenLabs TTS (Daniel voice - English)

### Previous Features (COMPLETE)
- Relationship scoring engine (warmth, trust, playfulness, attachment)
- Enhanced AI personality blueprint
- 25-word response limit
- Merged chat + voice screen
- Desktop warning modal

## Tech Stack
- **Frontend**: React, Tailwind CSS, lucide-react, Web Audio API
- **Backend**: FastAPI, Python, MongoDB
- **AI**: Claude claude-sonnet-4-5-20250929 via emergentintegrations
- **Voice**: ElevenLabs TTS (English only), OpenAI Whisper STT

## API Endpoints
- `POST /api/chat/message?user_id=X&language=Y` - Send message (language optional, default: en)
- `POST /api/chat/starter?user_id=X&bestie_id=Y&language=Z` - Get greeting
- `POST /api/avatar/speak` - Generate TTS audio

## Test Reports
- `/app/test_reports/iteration_7.json` - Dynamic Expressions (100% pass)

## Backlog/Future Enhancements
- P1: Multi-lingual TTS (different voices per language)
- P2: Display relationship stats in UI
- P3: Weekly mood insights/reports
- P3: Push notifications for re-engagement
