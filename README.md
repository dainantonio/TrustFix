# TrustFix

TrustFix is a local-first home services marketplace designed to beat legacy directories with AI-powered reliability.

## Phase 4 Implemented: Proactive Agent + Autonomous Actions
Phase 4 adds autonomy on top of the Phase 2 data layer and Phase 3 intelligence layer.

## What is now live

### 1) ETA watchdog (background loop)
- A recurring background loop monitors all `In Progress` jobs.
- If ETA is exceeded by `>15 min`, the agent auto-logs an alert and surfaces re-match options.
- If ETA is exceeded by `>45 min`, the agent automatically initiates a re-match proposal and notifies the homeowner with backup contractor details.

### 2) Anomaly detection
- **Price variance:** quote flagged when `>30%` above category average.
- **Repeat disputes:** contractor suspended from new matches if they receive a 2nd dispute within 30 days.
- **Unusual duration:** long-running “simple faucet fix” jobs are flagged for review after 4+ hours in progress.

### 3) Homeowner notification queue
- In-app notification center stores all autonomous agent actions.
- Each notification supports `Accept`, `Dismiss`, and `Ask agent why`.

### 4) Agent memory
- Homeowner preference memory tracks accepted contractors and boosts future ranking.
- Address-level pattern awareness flags repeat job patterns (e.g., multiple plumbing visits in 60 days) and suggests preventive inspection.

## Why this matters
TrustFix now acts on behalf of homeowners without waiting for manual interaction, which is the core of genuinely agentic behavior.

## Build sequence
- **Phase 2:** Data layer (reliability events and live trust scoring)
- **Phase 3:** Intelligence layer (structured parsing + declarative routing)
- **Phase 4:** Autonomy layer (watchdogs, anomaly actions, proactive notifications, memory)

## Next Build Targets
- Move autonomous checks and notifications to backend workers.
- Persist notifications, memory, and policy actions in a real datastore.
- Integrate outbound channels (SMS/email) for high-severity alerts.
- Add automated policy tests for watchdog thresholds and suspension logic.
