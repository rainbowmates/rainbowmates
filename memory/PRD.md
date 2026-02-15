# Rainbow Mates - Product Requirements Document

## Original Problem Statement
Rainbow Mates is a mobile-first application for creating a virtual gay best friend ("Bestie") to chat with.

## What's Been Implemented

### Feb 15, 2026 - Relationship Scoring Engine (COMPLETE)
- Built dynamic relationship engine at `/app/backend/services/relationship_engine.py`
- Tracks 4 evolving scores: warmth, trust, playfulness, attachment
- Auto-detects user mood from messages
- Bestie mood adapts based on user mood + relationship scores
- Streak tracking for daily engagement
- New API endpoints: `/api/relationship/{user_id}/{bestie_id}`, `/api/relationship/scores/{user_id}/{bestie_id}`

### Feb 15, 2026 - Enhanced AI Personality Blueprint (COMPLETE)
- Added Core Identity Blueprint to prompts
- Dynamic injection of relationship scores into prompts
- Emotional behavior rules (soften when sad, increase sass when playful)
- Natural human variation (rotate response styles)
- Subtle flaws (dramatic, exaggerate, pet peeves)
- Avatar expression signals

### Feb 15, 2026 - Prompt Consolidation (COMPLETE)
- Created shared prompt utility at `/app/backend/utils/prompts.py`
- Single source of truth for all AI personality prompts
- Removed duplicate prompts from server.py and bestie_service.py

### Feb 15, 2026 - New Bestie Image (COMPLETE)
- Added "Freckled Charm" bestie option from user-provided image

### Feb 15, 2026 - Voice Controls, Mood Tracking & Multi-Lingual (COMPLETE)
- Voice playback controls (pause/resume, listen again)
- Mood tracking via AI analysis
- 6 languages: English, French, Italian, German, Spanish, Portuguese

### Feb 14, 2026 - Previous Features (COMPLETE)
- 25-word response limit
- Merged chat + voice screen
- Conversation starters
- Proactive AI behavior
- Desktop warning modal

## Relationship Scoring System

### Scores (0.0 - 1.0)
| Score | Default | Grows From |
|-------|---------|------------|
| warmth_score | 0.3 | Regular chatting, positive messages |
| trust_score | 0.2 | Vulnerability, sharing secrets |
| playfulness_score | 0.5 | Jokes, emojis, playful banter |
| attachment_score | 0.1 | Consistency, returning after absence |

### Relationship Stages
- **< 0.3 avg**: "Getting to Know Each Other"
- **0.3-0.5**: "Building Trust"
- **0.5-0.7**: "Close Friends"
- **> 0.7**: "Ride or Die"

### Bestie Moods (auto-selected)
- comforting, supportive, playful, excited, protective, curious, sassy, warm, affectionate, friendly

## AI Personality Prompt Structure
**Single source of truth:** `/app/backend/utils/prompts.py`

## Tech Stack
- **Frontend**: React, Tailwind CSS, lucide-react
- **Backend**: FastAPI, Python, MongoDB
- **AI**: Claude claude-sonnet-4-5-20250929 via emergentintegrations
- **Voice**: ElevenLabs TTS, OpenAI Whisper STT

## Next Action Items
- Populate actual translations (currently English placeholders)

## Backlog/Future Enhancements
- P2: Display relationship stats in UI
- P3: Weekly mood insights/reports
- P3: Push notifications for re-engagement
