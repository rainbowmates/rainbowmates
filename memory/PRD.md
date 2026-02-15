# Rainbow Mates - Product Requirements Document

## Original Problem Statement
Rainbow Mates is a mobile-first application for creating a virtual gay best friend ("Bestie") to chat with.

## What's Been Implemented

### Feb 15, 2026 - Dynamic Avatar Expressions (COMPLETE)
**8 Core Expression States Implemented:**
1. **SOFT_COMFORTING** - User sad/anxious/vulnerable. Soft blue glow, gentle eyes.
2. **PLAYFUL_TEASING** - Light banter. Pink glow, asymmetric smirk.
3. **DRAMATIC_DISBELIEF** - Surprising news. Gold glow, wide eyes, mouth open.
4. **PROTECTIVE_SERIOUS** - User facing conflict. Steel blue glow, firm expression.
5. **CURIOUS_LEAN_IN** - User shares info (DEFAULT). Green glow, raised brows.
6. **EXCITED_SPARKLE** - Good news. Bright gold glow, full smile, sparkle effect.
7. **TEASING_EYEROLL** - User repeating bad decision. Light pink, eye roll animation.
8. **GENTLE_CONCERN** - User emotional. Pale blue glow, soft empathetic expression.

**Technical Implementation:**
- AI prompt includes expression tagging instructions: `[expression: TAG]`
- `parse_expression_from_response()` extracts tag, removes from displayed message
- `get_expression_config()` returns full visual config for avatar
- TalkingAvatar.jsx has visual properties: eyebrows, eyeScale, mouthCurve, headTilt, glowColor
- Expression label shows current state below avatar
- Smooth 300-500ms transitions between expressions

**Files Modified:**
- `/app/backend/utils/prompts.py` - EXPRESSION_STATES, parse/config functions
- `/app/backend/server.py` - Expression parsing in chat endpoints
- `/app/frontend/src/components/TalkingAvatar.jsx` - 8 expression visual configs
- `/app/frontend/src/pages/AvatarChatScreen.jsx` - Expression state handling

### Feb 15, 2026 - Talking Avatar Feature (COMPLETE)
**Tom - The Only Bestie**
- Replaced all bestie images with single character "Tom"
- Tom's image: `https://customer-assets.emergentagent.com/job_d78d511c-01b3-4716-b2c4-6339dea946bb/artifacts/dmzb8405_tom.png`

**2.5D Talking Avatar Components:**
- `/app/frontend/src/components/TalkingAvatar.jsx` - Avatar with Web Audio API lip-sync
- `/app/frontend/src/pages/AvatarChatScreen.jsx` - New chat screen with avatar view
- Breathing animation, emotion glow effects, speaking indicator

**Backend TTS Service:**
- `/app/backend/services/streaming_tts.py` - ElevenLabs TTS with emotion payload
- Voice: Daniel (British) - onwK4e9ZLuTAKqWW03F9
- Voice modulation based on emotion state
- 750 monthly TTS limit with usage tracking

**API Endpoints:**
- `POST /api/avatar/speak` - Generate speech with emotion payload
- `GET /api/avatar/usage/{user_id}` - Check usage stats

### Feb 15, 2026 - Relationship Scoring Engine (COMPLETE)
- Built at `/app/backend/services/relationship_engine.py`
- Tracks: warmth, trust, playfulness, attachment (0.0-1.0)
- Auto-detects user mood, bestie adapts
- Streak tracking, relationship stages

### Feb 15, 2026 - Enhanced AI Personality Blueprint (COMPLETE)
- Core Identity Blueprint in prompts
- Dynamic relationship score injection
- Emotional behavior rules
- Natural human variation
- Subtle flaws (dramatic, exaggerate, pet peeves)

### Feb 15, 2026 - Prompt Consolidation (COMPLETE)
- Single source at `/app/backend/utils/prompts.py`

### Feb 14, 2026 - Previous Features (COMPLETE)
- 25-word response limit
- Merged chat + voice screen
- Conversation starters
- Proactive AI behavior
- Desktop warning modal
- Multi-language framework

## Tech Stack
- **Frontend**: React, Tailwind CSS, lucide-react, Web Audio API
- **Backend**: FastAPI, Python, MongoDB
- **AI**: Claude claude-sonnet-4-5-20250929 via emergentintegrations
- **Voice**: ElevenLabs TTS (Daniel voice), OpenAI Whisper STT

## Test Reports
- `/app/test_reports/iteration_7.json` - Dynamic Expressions (100% pass - 14/14)
- `/app/test_reports/iteration_6.json` - Talking Avatar tests (100% pass)

## Next Action Items
- Populate actual translations (currently English placeholders)

## Backlog/Future Enhancements
- P2: Display relationship stats in UI
- P3: Weekly mood insights/reports
- P3: Push notifications for re-engagement
