# TrustFix

TrustFix is a local-first home services marketplace designed to beat legacy directories with AI-powered reliability.

## Current Direction
We are now in the **next phase** of the prototype:
- Keep the original marketplace experience (homeowners finding local pros).
- Add practical AI in the core product journey rather than static strategy content.
- Make every recommendation explainable, local, and trust-oriented.

## What Was Added In This Phase
`index.html` now includes an end-to-end **agentic job flow** demo:
1. **AI Intake Parsing**
   - User enters free-text issue details.
   - AI logic infers likely trade (plumber/electrician/handyman), urgency, and action summary.
2. **AI Matching**
   - Candidate local pros are filtered by detected trade.
   - Results are ranked by reliability score and ETA.
3. **Execution Tracking**
   - Job progresses through visible lifecycle states:
     `Intake → Matching → Booked → In Progress → Completed`.
4. **Pilot Conversion**
   - Updated CTA and waitlist for phase-2 launch enrollment.

## Why It Matters
- **For homeowners:** faster and clearer decisions with transparent reasoning.
- **For local pros:** fair ranking based on performance and responsiveness.
- **For operations:** visible workflow state improves fulfillment quality.

## Next Build Targets
- Persist job events and stage transitions via backend APIs.
- Add homeowner + pro auth and profile verification.
- Store reliability events and produce explainable trust scores.
- Integrate real messaging and payment hold/release flow.
- Add automated tests for intake parsing, matching rank rules, and lifecycle transitions.
