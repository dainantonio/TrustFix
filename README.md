# TrustFix

TrustFix is a local-first home services marketplace designed to beat legacy directories with AI-powered reliability.

## Phase 4 status
Phase 4 autonomy is implemented with proactive watchdog checks, anomaly detection, notification actions, and preference memory.

## Refactor: code is now split into manageable files
To keep implementation scalable, the single-file prototype was split into modules:

- `index.html` — entrypoint + script loading
- `src/data.js` — contractors, seeded reliability events, localStorage helpers, default job fixtures
- `src/scoring.js` — trust scoring formula + preference boost wrapper
- `src/parsing.js` — LLM intake parser + fallback parser
- `src/autonomy.js` — smart routing + backup contractor selection
- `src/App.jsx` — UI composition, state orchestration, watchdog loop, notification actions

## Autonomy features live now
- ETA watchdog (`>15m` alert, `>45m` auto re-match proposal)
- Price variance flag (`>30%` over category average)
- Repeat dispute suspension policy (2+ disputes / 30 days)
- Unusual job duration flag for simple jobs
- In-app homeowner notification center with `Accept`, `Dismiss`, `Ask agent why`
- Preference memory boosts for repeatedly accepted contractors
- Address-level pattern alerting for preventive suggestions

## Next implementation targets
- Move watchdog/anomaly logic from client loop to backend worker
- Persist notifications/memory/policy actions to a database
- Add outbound messaging adapters (SMS/email)
- Add tests for routing, watchdog thresholds, and suspension rules
