# TrustFix

TrustFix is a local-first home services marketplace designed to beat legacy directories with AI-powered reliability.

## Phase 4+ status
Phase 4 autonomy is still active, and this iteration adds a backend-ready service contract split so we can move from browser-only orchestration to worker/API architecture.

## Architecture (modular)
- `index.html` — entrypoint + module wiring
- `src/data.js` — contractors, reliability event seed/store, default jobs
- `src/scoring.js` — trust scoring + preference boost
- `src/parsing.js` — LLM parsing + fallback parsing
- `src/autonomy.js` — routing + backup candidate selection
- `src/api.js` — API contract shim for persistence (`notifications`, `memory`, `suspensions`)
- `src/worker.js` — autonomy worker evaluator (`evaluateAutonomy`) with policy checks
- `src/App.jsx` — UI + orchestration that now calls API/worker modules

## What changed in this iteration
1. **API contract layer added**
   - Notification list/update
   - Preference memory get/update
   - Suspension map get/update
2. **Autonomy worker extracted**
   - ETA watchdog thresholds
   - Price variance checks
   - Long duration checks
   - Address pattern memory alerts
   - Repeat dispute suspension
3. **UI wired to contract**
   - Notification actions now write through contract methods
   - Memory/suspension state now persists via contract methods

## Why this is important
This creates a clean handoff point to a real backend:
- swap `src/api.js` localStorage methods with HTTP calls,
- move `src/worker.js` execution to a backend job worker,
- keep the UI contract mostly unchanged.

## Next implementation targets
- Replace `src/api.js` with real HTTP client + backend endpoints
- Run `evaluateAutonomy` server-side on a scheduler/queue
- Add automated tests for worker policy outcomes and contract behaviors
- Add outbound notifier adapters (SMS/email)
