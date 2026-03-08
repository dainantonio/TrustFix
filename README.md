# TrustFix

TrustFix is a local-first home services marketplace designed to beat legacy directories with AI-powered reliability.

## Phase 3 Implemented: LLM Intake Parsing + Smart Routing Rules
This phase adds the intelligence layer that turns intake into structured reasoning and rule-driven routing.

### Structured Extraction Layer
Free-text homeowner descriptions are parsed into structured JSON:

```json
{
  "trade": "plumbing",
  "severity": "moderate",
  "urgency": "same-day",
  "summary": "Shutoff valve leak, 48hrs ongoing",
  "suggestedActions": ["Inspect shutoff valve", "Check water pressure", "Assess pipe condition"],
  "flags": ["potential_water_damage"]
}
```

### LLM + Fallback Strategy
- `llmParseIntake` calls an LLM endpoint when `window.TRUSTFIX_OPENAI_API_KEY` is available.
- If unavailable/failing, the system gracefully falls back to a keyword parser.
- Agent log includes a warning when fallback is used.

### Declarative Routing Rules Engine
Rules are encoded as `when + apply + description` objects and applied in sequence:
1. `severity=critical` → only contractors with score `>= 95` and ETA `<= 2hrs`
2. `urgency=emergency` → top 3 are selected for simultaneous alerting behavior
3. `flags` includes `potential_water_damage` → mitigation specialists are added to pool
4. Global capacity guardrail: exclude contractors with active jobs `> 2`

### Explainability Layer
Agent reasoning log shows full decision narrative, for example:
- Parsed trade/severity/urgency
- Which routing rules were applied
- Which candidates were excluded
- How many candidates were ranked

## Why this matters
TrustFix now behaves like an intake agent that understands real homeowner language and explains recommendations with transparent routing logic.

## Next Build Targets
- Add provider abstraction to support OpenAI + Gemini from environment config.
- Move LLM calls to backend to protect API keys.
- Persist intake parse artifacts and routing decisions for auditability.
- Add automated tests for parser fallback, rule application order, and emergency fan-out behavior.
