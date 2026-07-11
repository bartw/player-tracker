# Map: Circuit Tracker PWA

Label: wayfinder:map

## Destination

A working PWA on the coach's phone, used after each Mon/Wed/Fri session to transcribe the strength-circuit poster into a **new** Notion tracker database that keeps per-session history, with a per-player progress view of the 8-week journey. Done when the app is deployed, locked, installed, the existing data has been backfilled through it, and a real session has been logged with it.

## Notes

- **Execution is in scope for this map** (override of the plan-only default): the destination is a working app, not a spec.
- Domain: U14 hockey off-ice summer program, strength circuit — 6 patterns (H-push, H-pull, V-push, V-pull, SL-hinge, SL-squat). A position = variant (full movement name) + free sets×reps, plus KB weight on SL-hinge/SL-squat; **pull-up is special**: 3 sets to max reps + assistance band (black > yellow > blue > none). Progression is coach's-feel, not a strict ladder — the documented 6-step ladder on the Strength circuit page is stale (see the schema ticket's answer). Roster currently 5 players; kids self-manage a physical station poster during sessions.
- Source material: [Off-Ice Summer Program](https://app.notion.com/p/38b3ce70714b817b813bf8d911f56542) · [Strength circuit page](https://app.notion.com/p/38c3ce70714b8036a4dffef19cd92460) (full rules) · [current Strength Circuit Tracker](https://app.notion.com/p/740ac6e116e34b37ac096b338112761f) (one row per player, current state only, `collection://30ea1668-e862-4f95-85c9-e7fa2b0bfc82`).
- Skills to consult per ticket type: /grilling + /domain-modeling for decisions, /prototype for UI questions, /research for API/docs reading.
- Standing constraints locked during charting:
  - Coach-only tool; players interact with the poster, never the app.
  - App is a **front-end for Notion** — Notion stays the source of truth; a new tracker database will be created and reshaped for history; existing data backfilled manually through the app.
  - Entry happens after the session from the poster; **online-only**, no offline queue.
  - Stack: **TypeScript + Vercel-style serverless** (small proxy holds the Notion token; Notion API blocks browser calls).
  - Access lock: resolved to a shared-secret cookie on `/api/*` — Vercel platform protection can't cover production on the Hobby plan (see the access-lock ticket).
  - App is a **recorder + suggestion** — refined by the schema ticket to: prefill from last session + gentle nudge, no rules engine.
- Tracker: local markdown (this directory). Tickets in `issues/`, `Blocked by:` lines express blocking, frontier = open + unblocked + unclaimed, lowest number first.

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [Design the new Notion history schema](issues/01-notion-history-schema.md) — two app-script-created databases: Circuit Sessions (one row per player-session; relation to Players, date, six readable-text pattern strings like `Hand-release push-up 3×6` / `Pull-up 5/4/3 yellow`, notes) + Players; prefill + gentle nudge instead of a rules engine; absence = no row; also corrected the stale ladder domain model (free sets×reps, kg on SL patterns, pull-up = 3×max + band black>yellow>blue>none).
- [Research the Notion API integration](issues/02-notion-api-research.md) — target API version `2026-03-11`, rows via data-source endpoints; setup script creates Players first then Circuit Sessions (relations point at data-source IDs); prefill query confirmed (`relation.contains` + date sort desc + page_size 1); rate limits fine for session bursts; CORS absent so the proxy stands; SDK v5 is dependency-free and Vercel-clean; full cited findings in [notion-api-research.md](assets/notion-api-research.md).
- [Verify the Vercel access lock](issues/03-vercel-access-lock.md) — platform protection is out (Hobby leaves production public; even Pro needs a $150/mo add-on; PWA interplay undocumented): ship the fallback — public shell/manifest/service-worker, `/api/*` behind a long-lived HttpOnly shared-secret cookie set by a PIN screen, checked in middleware + proxy; findings in [vercel-access-lock-research.md](assets/vercel-access-lock-research.md).
- [Prototype the after-session entry flow](issues/04-entry-ui-prototype.md) — variant C "Confirm sheet" won: per-player summary list, everyone carries last session forward, tap-to-edit bottom sheet, absent = no row, past-date backfill badge, save previews the canonical Notion strings; real variant ladders captured for app config (doc lists confirmed, pull-up = band ladder); prototype at [entry-flow-prototype.html](assets/entry-flow-prototype.html).
- [Prototype the progress view](issues/05-progress-view-prototype.md) — "B home → A detail" won: Team board grid (trend glyphs + loud static ×N badges; primary question is "who's stuck?") opening into per-player Report cards (volume sparklines, ringed variant/band markers, pull-up band strip); volume-as-axis and band-first pull-up reading validated; prototype at [progress-view-prototype.html](assets/progress-view-prototype.html).
- [Pick the concrete stack](issues/06-pick-concrete-stack.md) — Next.js App Router (TS) at repo root, pnpm, Tailwind; proxy = `app/api/*` route handlers with Notion SDK v5 pinned to `2026-03-11`; `middleware.ts` + handler re-check enforce the PIN cookie; manifest + no-op SW for the PWA; secrets in Vercel env vars; deploy tracks `main`.
- [Deploy a walking skeleton](issues/07-walking-skeleton.md) — live at https://player-tracker-livid.vercel.app, PIN lock verified in production, both Notion databases created and seeded (IDs in the ticket's Answer), full write/read round-trip proven from the deployed app; secrets in `.env.local` + Vercel env vars.

## Not yet specified

<!-- fog cleared 2026-07-11: with the schema and both prototypes resolved, the remaining route graduated into the build/backfill/first-session tickets (PWA polish folded into the walking skeleton and the first-session acceptance). Nothing left un-tickable. -->

## Out of scope

- **Test results tracking** (Player Test Tracker) — stays in Notion as-is; only 3 entry moments (BL/W4/W8), no app needed.
- **Session running / progressions / session skeleton** — the app doesn't plan or run sessions.
- **Attendance** — not tracked anywhere today; ruled out during charting.
- **Player/parent access** — coach-only; revisit only as a new effort.
- **Offline support** — online-only is fine; a poster photo carries data out of the gym.
- **Automated migration of the old tracker** — the new Notion database starts empty; data is backfilled manually via the app.
