# TrustFix

TrustFix is a local-first home services marketplace designed to beat legacy directories with AI-powered reliability.

## Phase 2 Implemented: Trust Score Engine (Data Layer)
The prototype now includes a working reliability data layer that learns from contractor outcomes instead of static hardcoded scores.

### ReliabilityEvent Store
Events are persisted in `localStorage` (designed to move to DB later) using this structure:
- `contractorId`
- `jobId`
- `type`: `completed_on_time | late | dispute | cancelled`
- `timestamp`
- `rating`

### Live Scoring Formula
Each contractor score is recalculated in real time from event history:

`baseScore × recencyWeight + onTimeRate × 40 + completionVolume × 10 − disputePenalty × 15`

### What the UI now demonstrates
1. **Real-time re-ranking** of matched contractors based on fresh score calculations.
2. **Agent explanation log** for score changes (before/after and reliability context).
3. **Score history sparkline** (last 10 score updates) on contractor cards.
4. **Manual event simulation controls** so teams can test how reliability changes routing.

## Why this matters
- Homeowners can trust recommendations because scoring is explainable and tied to outcomes.
- Contractors are rewarded for consistent on-time, dispute-free work.
- The agent now has a feedback loop and can learn from recent performance trends.

## Next Build Targets
- Move ReliabilityEvent storage from localStorage to backend DB.
- Ingest real booking lifecycle events automatically (not just simulated controls).
- Add authenticated event write paths for homeowners, pros, and ops.
- Add automated tests for scoring formula, ranking behavior, and event persistence.
