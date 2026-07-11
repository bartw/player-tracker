# Pick the concrete stack

Type: grilling
Status: resolved
Blocked by: 02, 03

## Question

Within the locked "TypeScript + Vercel-style serverless" constraint, which exact pieces? One short decision, not a survey.

To resolve (via /grilling, informed by the two research tickets):

- Framework: Next.js / SvelteKit / Vite SPA + serverless functions — whichever the coach is happiest maintaining solo.
- PWA layer: manifest + minimal service worker (online-only, so no offline caching complexity).
- Where the proxy lives (framework API routes vs standalone function) and how the Notion token + access lock findings slot in — the chosen framework must support routing middleware (or equivalent) for the shared-secret cookie check on `/api/*` (see the access-lock ticket's Answer).
- Repo layout in player-tracker and deploy pipeline (Vercel project, envs).

## Answer

Resolved 2026-07-11 by grilling session.

- **Framework**: Next.js App Router, TypeScript, at the **repo root** of player-tracker.
- **Package manager**: pnpm. **Styling**: Tailwind, no component library (bottom sheet hand-rolled from the prototype).
- **Proxy**: route handlers under `app/api/*` using `@notionhq/client` v5 with explicit `notionVersion: "2026-03-11"` (per the API research). `middleware.ts` enforces the shared-secret HttpOnly cookie on `/api/*`; handlers re-check it (defense in depth per the access-lock ticket). A PIN screen sets the cookie once per device.
- **PWA layer**: `manifest.json` + icon + minimal no-op service worker; no offline caching (online-only decision). 
- **Secrets/config**: Vercel env vars — Notion token, PIN secret, Players + Circuit Sessions database IDs (emitted by the setup script).
- **Deploy**: Vercel project linked to GitHub `bartw/player-tracker`, production tracks `main`.
