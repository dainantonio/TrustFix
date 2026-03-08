# TrustFix

TrustFix is a local-first home services marketplace designed to beat legacy directories with AI-powered reliability.

## Current Product Surface (visible in frontend)
The UI now explicitly presents all prior phases in one screen:
- **Phase 2 (Data layer):** trust scoring + preference memory + job state
- **Phase 3 (Intelligence layer):** intake parsing (LLM + fallback) + smart routing results
- **Phase 4 (Autonomy layer):** proactive notification center with actionable agent prompts

## Architecture (modular)
- `index.html` — entrypoint + module wiring
- `src/data.js` — contractors, reliability event seed/store, default jobs
- `src/scoring.js` — trust scoring + preference boost
- `src/parsing.js` — LLM parsing + fallback parsing
- `src/autonomy.js` — routing + backup candidate selection
- `src/api.js` — API contract shim for persistence (`notifications`, `memory`, `suspensions`)
- `src/worker.js` — autonomy worker evaluator (`evaluateAutonomy`) with policy checks
- `src/App.jsx` — visible product UI + orchestration using all phase modules

## Why this is important
This keeps a clear frontend while preserving backend-ready seams:
- swap `src/api.js` localStorage methods with HTTP calls,
- move `src/worker.js` execution to a backend job worker,
- keep UI behavior and data contract stable.

## Next implementation targets
- Replace `src/api.js` with real HTTP client + backend endpoints
- Run `evaluateAutonomy` server-side on scheduler/queue
- Add automated tests for worker policy outcomes and contract behaviors
- Add outbound notifier adapters (SMS/email)
