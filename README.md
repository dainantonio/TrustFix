# TrustFix

TrustFix is a local-first home services marketplace designed to beat legacy directories with AI-powered reliability.

## Pages in this project
- `index.html` — **landing page** (public marketing/home)
- `demo.html` — Phase 2/3/4 interactive product demo
- `roadmap.html` — phased delivery overview
- `waitlist.html` — launch sign-up page

## GitHub Pages URLs
If this repo is published at `https://dainantonio.github.io/TrustFix/`:
- Landing: `https://dainantonio.github.io/TrustFix/`
- Demo: `https://dainantonio.github.io/TrustFix/demo.html`
- Roadmap: `https://dainantonio.github.io/TrustFix/roadmap.html`
- Waitlist: `https://dainantonio.github.io/TrustFix/waitlist.html`

## Architecture (modular demo)
- `src/data.js` — contractors, reliability event seed/store, default jobs
- `src/scoring.js` — trust scoring + preference boost
- `src/parsing.js` — LLM parsing + fallback parsing
- `src/autonomy.js` — routing + backup candidate selection
- `src/api.js` — API contract shim for persistence (`notifications`, `memory`, `suspensions`)
- `src/worker.js` — autonomy worker evaluator (`evaluateAutonomy`) with policy checks
- `src/App.jsx` — visible product demo UI + orchestration

## Deployment notes
- `.github/workflows/deploy-pages.yml` auto-deploys to GitHub Pages on push to `main`.
- `.nojekyll` ensures static files are served as-is.
- If site appears stale, hard refresh browser (`Cmd/Ctrl+Shift+R`).
