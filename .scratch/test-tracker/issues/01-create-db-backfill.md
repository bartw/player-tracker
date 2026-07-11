# Create the Test Results database and backfill baselines

Type: task
Status: open

## Question

AFK script task: create the **Test Results (app)** database in Notion under the program page (relation to Players (app), Date, six number properties — Sprint (s), Jump (cm), Single Jump (cm), T-test (s), Push-ups, Yo-Yo (m) — and Notes), then backfill the 5 existing baselines from the old Player Test Tracker as rows dated **2026-07-01**, matched to Players (app) pages by name.

Extend `scripts/setup-notion.ts` or add a sibling script; reuse the existing integration token/env pattern. Resolution records the new database + data-source IDs and the backfilled row count. Baseline values live in the old table (`collection://cce10c7f-f519-40a1-9d57-99d3207a5f79`): Lars, Senn, Finn Pallen, Linus, Tijs — full 6-test baselines each.
