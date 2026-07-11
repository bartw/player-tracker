# Research the Notion API integration

Type: research
Status: resolved

## Question

What does the app's proxy need to know to read/write the tracker via the Notion API? Produce a markdown summary as a linked asset.

To resolve (via /research against developers.notion.com):

- Current API version and the data-source model (databases vs data sources, 2025 API changes); which endpoints create a database, add rows, and query with filters/sorts.
- Auth: internal integration token setup, sharing the target page with the integration, minimum capabilities needed.
- Rate limits and payload limits — does ~15 players × 6 patterns per session fit comfortably in one after-session write burst?
- Confirm: no browser CORS support (hence the proxy), and whether the official JS SDK is proxy-friendly on serverless.
- Latency reality-check for a "read whole history, compute positions" view; whether the app should cache.
- Creating databases programmatically (the schema ticket decided on an app **setup script**): endpoints for creating the two databases, including a **relation property** between Circuit Sessions and Players; querying rows filtered/sorted by relation + date (for "player's most recent row" prefill).

## Answer

Resolved 2026-07-11. Full findings with citations: [notion-api-research.md](../assets/notion-api-research.md).

Gist:

- **Target API version `2026-03-11`** (one past the 2025-09-03 data-source split; nothing in the newer release affects this app). Rows are created with `parent.data_source_id` and queried via `POST /v1/data_sources/{id}/query`.
- **Setup script order is forced but unproblematic**: relations point at a *data source* ID, so create Players first, read `data_sources[0].id` from the create-database response, then create Circuit Sessions with the relation. No circularity.
- **"Most recent row for player" confirmed**: filter `relation.contains` (player page UUID) + sort on the Date property descending + `page_size: 1`.
- **Rate limits are a non-issue**: ~3 req/s average with burst tolerance; a 15-row session write ≈ 5 s serialized. SDK v5 auto-retries 429/529 honoring Retry-After — but retry delays can outlive a serverless function timeout, so the proxy should keep an eye on total duration.
- **CORS**: no browser calls, confirmed via a Notion team member's statement on notion-sdk-js issue #96 (no official doc page states it) — the proxy is necessary as assumed.
- **SDK `@notionhq/client` v5** has zero runtime deps (native fetch, Node ≥ 18) — clean on Vercel Node functions; it defaults to version `2025-09-03`, so pass `notionVersion: "2026-03-11"` explicitly.
- **Auth**: internal integration token (`ntn_` prefix); minimum capabilities read + insert + update content; share the parent page via ••• → Add connections.
- **Latency is undocumented**; reading full history (~360 rows) = 4 sequential 100-row pages → fetch once and cache app-side for the progress view.
