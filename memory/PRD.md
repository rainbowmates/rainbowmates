# Rainbow Mates - Product Requirements Document

## Original Problem Statement
Rainbow Mates is a mobile-first application for creating a virtual gay best friend ("Bestie") to chat with. Key requirements include:

1. **Desktop Warning**: Show popup with QR code advising users to use mobile
2. **UI/UX Enhancements**: Update splash/intro screen text, layout, and labels
3. **Auth Flow**: Registration as default view with sign-in link
4. **Avatar/Bestie Creation**: Updated relationship status, feelings, personality options
5. **Voice Selection**: New voice options with ElevenLabs TTS settings
6. **AI Behavior**: Bestie should be PROACTIVE and lead conversations

## What's Been Implemented

### Feb 14, 2026 - Proactive AI Bestie (P0 COMPLETE)
- **Updated System Prompt**: Modified `backend/services/bestie_service.py` (build_system_prompt) and `backend/server.py` (get_bestie_system_prompt)
- **AI Now Proactively**:
  - Always ends responses with follow-up questions
  - Brings up new topics (day, plans, dating, work drama)
  - Digs deeper into user responses
  - Shares opinions and hot takes to spark discussion
  - Uses terms of endearment naturally
- **Testing**: 17/17 backend tests passed confirming proactive behavior

### Feb 14, 2026 - Desktop Detection Modal
- Detects desktop devices (screen width >= 768px)
- Shows QR code of current URL for mobile access
- Session-persisted dismissal

### Feb 14, 2026 - IntroScreen Updates
- "Your virtual bestie awaits!" → "Girls, Make Your Gay Best Mate here"
- Bouncing images replaced with static 2x2 grid
- Labels renamed: "Text and Talk", "Shopping advice", "Relationship advice", "Chill time"

### Feb 14, 2026 - SplashScreen Update
- "Your Virtual Best Friend" → "Your Virtual Gay Bestie"

### Feb 14, 2026 - Auth Page Restructure
- Registration is default view
- Added sign-in/register navigation links
- Login title changed to "Sign In"

### Feb 14, 2026 - Avatar Creation Updates
- New relationship status options with icons
- Multi-select checkbox for "How does the relationship feel"
- "Other (specify)" free-text option

### Feb 14, 2026 - Bestie Creation Updates
- Multi-select personality traits (10 options)
- 6 new voice options (British/American, without names)

### Feb 14, 2026 - Backend Voice Configuration
- ElevenLabs TTS settings configured in `backend/config.py`
- Voice ID stored in bestie model

## Code Architecture
```
/app/
├── backend/
│   ├── config/
│   │   ├── settings.py       # App configuration
│   │   └── database.py       # MongoDB connection
│   ├── services/
│   │   ├── bestie_service.py # Bestie logic + PROACTIVE system prompt
│   │   ├── chat_service.py   # Chat history management
│   │   └── user_service.py   # User operations
│   ├── routes/
│   │   ├── chat.py           # Chat endpoints
│   │   ├── auth.py           # Authentication
│   │   ├── bestie.py         # Bestie CRUD
│   │   └── ...
│   ├── server.py             # Alternative API routes with proactive prompt
│   └── main.py               # FastAPI app entry
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── DesktopWarningModal.jsx
    │   ├── pages/
    │   │   ├── IntroScreen.jsx
    │   │   ├── AuthPage.jsx
    │   │   ├── CreateAvatar.jsx
    │   │   ├── CreateBestie.jsx
    │   │   └── Dashboard.jsx
    │   └── utils/options.js
    └── tailwind.config.js    # Custom colors (neon-pink)
```

## Key API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (identifier-based)
- `POST /api/chat/message?user_id={id}` - Send chat message, get proactive response
- `GET /api/chat/history/{user_id}/{bestie_id}` - Get chat history
- `POST /api/bestie/create?user_id={id}` - Create bestie

## Tech Stack
- **Frontend**: React, Tailwind CSS, lucide-react, qrcode.react
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **AI**: Claude claude-sonnet-4-5-20250929 via emergentintegrations
- **TTS**: ElevenLabs

## Test Reports
- `/app/test_reports/iteration_2.json` - Proactive AI backend tests (17/17 passed)
- `/app/backend/tests/test_proactive_chat.py` - Test file for proactive behavior

## Next Action Items
- None - All user requirements completed

## Backlog/Future Enhancements
- P2: Add analytics for desktop vs mobile visits
- P2: Remember "always use desktop" preference across sessions
- P3: Voice message support in chat
- P3: Conversation mood tracking/analytics
