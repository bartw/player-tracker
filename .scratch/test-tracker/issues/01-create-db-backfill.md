# Create the Test Results database and backfill baselines

Type: task
Status: resolved

## Question

AFK script task: create the **Test Results (app)** database in Notion under the program page (relation to Players (app), Date, six number properties — Sprint (s), Jump (cm), Single Jump (cm), T-test (s), Push-ups, Yo-Yo (m) — and Notes), then backfill the 5 existing baselines from the old Player Test Tracker as rows dated **2026-07-01**, matched to Players (app) pages by name.

Extend `scripts/setup-notion.ts` or add a sibling script; reuse the existing integration token/env pattern. Resolution records the new database + data-source IDs and the backfilled row count. Baseline values live in the old table (`collection://cce10c7f-f519-40a1-9d57-99d3207a5f79`): Lars, Senn, Finn Pallen, Linus, Tijs — full 6-test baselines each.

## Answer

Resolved 2026-07-11 by `scripts/setup-tests.ts` (kept in the repo; reads the old table live rather than hardcoding values).

- **Test Results (app)**: database `34fefe38-d932-410b-abd8-97d7361ae58b`, data source `631a4d71-d853-483f-82d1-8c3c6e369cd4`, under the program page. Properties: Name (title), Player (relation → Players (app)), Date, Sprint (s), Jump (cm), Single Jump (cm), T-test (s), Push-ups, Yo-Yo (m), Notes.
- **5 baseline rows** dated 2026-07-01, all 6 tests each, matched to Players (app) by name and verified (relations + values spot-checked against the old table).
- `NOTION_TESTS_DS_ID` added to `.env.local` and the example; **must also be added to the Vercel project env vars before the build ticket deploys** (flagged for the build).
