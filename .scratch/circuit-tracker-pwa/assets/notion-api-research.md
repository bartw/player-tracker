# Notion API research — circuit tracker PWA proxy

Researched 2026-07-11 against primary sources only: developers.notion.com (docs + reference + changelog) and the official `makenotion/notion-sdk-js` GitHub repo. Every claim carries the URL of the page that owns it. Anything not confirmable from a primary source is flagged **unconfirmed**.

## TL;DR

1. **API version:** target `Notion-Version: 2026-03-11` (current latest); the big model change was `2025-09-03` (databases become containers, **data sources** hold schema/rows) — use `/v1/data_sources/...` for schema and queries.
2. **Endpoints:** create DB = `POST /v1/databases` (schema under `initial_data_source.properties`); add row = `POST /v1/pages` with `parent.data_source_id`; update row = `PATCH /v1/pages/{page_id}`; query = `POST /v1/data_sources/{id}/query` with compound `and`/`or` filters + sorts. Relations point at a **`data_source_id`**, so the setup script must create Players first, read its data source id from the response, then create Circuit Sessions.
3. **"Most recent row for player X":** filter `{property, relation: {contains: "<player page uuid>"}}` + sort `{property: "Date", direction: "descending"}` + `page_size: 1` — exact syntax confirmed.
4. **Auth:** internal integration created in the Developer portal (workspace owner required); token shown/regenerated in the Configuration tab, prefix `ntn_` since 2024-09-25; needs Read + Insert + Update content capabilities; parent page must be shared via `•••` → `Add connections`.
5. **Rate limits:** avg 3 requests/sec per connection with bursts allowed; 429 + integer `Retry-After` seconds; a 15-request burst is fine (~5 s worst case) and the official SDK auto-retries 429s (default 2 retries, respects Retry-After).
6. **CORS:** not supported — Notion team member on the official SDK repo: "we currently don't support CORS and don't recommend making API calls from a web page." Proxy required.
7. **SDK:** `@notionhq/client` v5 (v5.23.0), full data-source support, zero runtime dependencies / native fetch (node ≥ 18), webhook helpers explicitly run on Vercel Edge; defaults to `2025-09-03` — pass `notionVersion: "2026-03-11"` explicitly.
8. **Latency:** per-request latency is **not documented anywhere official**; page_size max is 100, so ~360 history rows = 4 sequential paginated queries — cache/aggregate client-side.

---

## 1. API version and the 2025 data-source model

- The API is date-versioned via the required `Notion-Version` header; the **current version is `2026-03-11`**. Notion has "no current plans to stop supporting older API versions," but recommends the latest for new work. — https://developers.notion.com/reference/versioning
- **`2025-09-03`** introduced multi-source databases: a **database** is now a container holding `title`/`icon`/`cover`/`parent`; a **data source** owns the `properties` schema and is the direct parent of pages and the target of relations. Key mechanical changes:
  - Query moved from `/v1/databases/{id}/query` to `/v1/data_sources/{data_source_id}/query`.
  - `GET /v1/databases/{id}` now returns a `data_sources` list (id + name) instead of the schema.
  - `POST /v1/databases` nests schema under `initial_data_source[properties]`.
  - Create-page parent changed from `{"type":"database_id",...}` to `{"type":"data_source_id",...}`.
  - New endpoints: `GET/PATCH /v1/data_sources/{id}`, create data source.
  - The upgrade is not backwards-compatible for integrations pinned to older versions once a database gains a second data source.
  — https://developers.notion.com/docs/upgrade-guide-2025-09-03
- **`2026-03-11`** (released 2026-03-11) is a small breaking release on top of that: `after` → `position` object in Append block children, `archived` → `in_trash` everywhere, `transcription` block renamed `meeting_notes`. Notion: "Most integrations only need simple find-and-replace updates." Supported by SDK v5.12.0+ via `notionVersion: "2026-03-11"`. — https://developers.notion.com/page/changelog
- **Recommendation for this new integration:** send `Notion-Version: 2026-03-11` and use the data-source endpoints for all row/schema operations. None of the 2026-03-11 breaking changes touch this app's surface (no blocks, no archived flag reads beyond `in_trash`).

## 2. Endpoints: create databases, add/update rows, query

### Create a database under a page

`POST /v1/databases` with `parent: { type: "page_id", page_id: "..." }`, `title` (rich text array), and `initial_data_source: { properties: {...} }`. Requires **insert content** capability (403 otherwise). — https://developers.notion.com/reference/database-create

The **response includes a required `data_sources` array** (items with `id` and `name`) — this is where the setup script gets the data source id it needs for subsequent page creation and for the relation definition. — https://developers.notion.com/reference/database-create

### Relation property definition (and the chicken-and-egg)

A relation property in a data source schema has this shape (response/request use `data_source_id`, not `database_id`):

```json
"Player": {
  "type": "relation",
  "relation": {
    "data_source_id": "<players data source uuid>",
    "dual_property": { "synced_property_name": "...", "synced_property_id": "..." }
  }
}
```

`single_property` is the non-synced variant; `dual_property` creates the bidirectional synced property. "Related databases must be shared with your connection." — https://developers.notion.com/reference/property-object (relation section), creation variant shown at https://developers.notion.com/reference/database-create

**Consequence for the setup script:** the relation target must already exist as a data source. Order of operations:

1. `POST /v1/databases` → create **Players** under the parent page → read `data_sources[0].id` from the response.
2. `POST /v1/databases` → create **Circuit Sessions** with a `relation` property whose `relation.data_source_id` is the Players data source id.

No circular dependency exists for this app (only Sessions → Players). Both databases live under the same shared parent page, so the connection has access to both. (Alternative if a relation ever needed to be added later: `PATCH /v1/data_sources/{id}` updates a schema after creation — https://developers.notion.com/docs/upgrade-guide-2025-09-03.)

### Add a row

`POST /v1/pages` with `parent: { type: "data_source_id", data_source_id: "..." }` and `properties` matching the data source schema. Requires **insert content**. Property value examples confirmed on the page: date `{"date": {"start": "2024-01-15"}}`, relation `{"relation": [{"id": "<page uuid>"}]}`. (`database_id` parent is still accepted, but `data_source_id` is the current-version form.) — https://developers.notion.com/reference/post-page

### Update a row

`PATCH /v1/pages/{page_id}` with a partial `properties` object (relations, dates, numbers, selects, rich text all updatable; rollups not; parent can't change). Requires **update content**. — https://developers.notion.com/reference/patch-page

### Query rows

`POST /v1/data_sources/{data_source_id}/query` with `filter`, `sorts`, `page_size`, `start_cursor`. Requires **read content** (403 otherwise). Paginates up to 10,000 results per query; beyond that `has_more` is false and `request_status.type` = "incomplete". — https://developers.notion.com/reference/query-a-data-source

Compound filters nest `and` / `or` arrays of property filters (and can nest one level deeper). — https://developers.notion.com/reference/filter-data-source-entries

## 3. "Most recent row for player X" — exact syntax

All shapes below are quoted from the filter and sort references.

Relation filter (operators: `contains`, `does_not_contain`, `is_empty`, `is_not_empty`; `contains` takes the related **page** UUID, i.e. the Player row's page id):

```json
{ "property": "Player", "relation": { "contains": "0c1f7cb280904f18924ed92965055e32" } }
```
— https://developers.notion.com/reference/filter-data-source-entries

Date filter operators (if ever needed): `equals`, `before`, `after`, `on_or_before`, `on_or_after`, `is_empty`, `is_not_empty`, plus relative (`past_month`, `next_week`, ...). — https://developers.notion.com/reference/filter-data-source-entries

Sort — property sort `{ "property": "Date", "direction": "descending" }` or timestamp sort `{ "timestamp": "created_time", "direction": "descending" }`; first sort in the array takes precedence. — https://developers.notion.com/reference/sort-data-source-entries

So the prefill query is:

```json
POST /v1/data_sources/{sessions_ds_id}/query
{
  "filter": { "property": "Player", "relation": { "contains": "<player page id>" } },
  "sorts": [{ "property": "Date", "direction": "descending" }],
  "page_size": 1
}
```

`page_size`: "Default: 100, Maximum: 100" — so 1 is valid. — https://developers.notion.com/reference/intro

## 4. Auth: internal integration

- Create the connection in the Developer portal (must be a **workspace owner**); the "installation access token" is retrieved from — and lives in — the **Configuration tab** of the connection. Notion: read it "from an environment variable," never commit it. — https://developers.notion.com/docs/authorization
- **Token format:** tokens generated since 2024-09-25 use the **`ntn_`** prefix (previously `secret_`; old tokens keep working). — changelog entry dated 2024-09-11: https://developers.notion.com/page/changelog?page=5 ; the official best-practices page shows the format in its example `NOTION_API_KEY=ntn_abc123...`: https://developers.notion.com/docs/best-practices-for-handling-api-keys
- **Rotation:** the best-practices page advises rotating keys on a schedule; regeneration happens from the same Configuration tab. The docs do not describe a dual-token rotation flow — **unconfirmed** whether regeneration invalidates the old token instantly (assume yes; plan a quick env-var swap on Vercel). — https://developers.notion.com/docs/best-practices-for-handling-api-keys
- **Capabilities** (set in the connection's Configuration): this app needs exactly **Read content** (query), **Insert content** (create databases + rows), **Update content** (edit rows). Comment and user-info capabilities can stay off. Missing capability → HTTP 403. — https://developers.notion.com/reference/capabilities
- **Page access:** an internal connection sees nothing until a page is shared with it: on the parent page, `•••` menu → "Add connections" → select the connection. Without this, "any API requests made will respond with an error." Databases created under that page by the integration are then reachable. — https://developers.notion.com/docs/authorization

## 5. Rate limits and payload limits

From https://developers.notion.com/reference/request-limits:

- **Rate:** "an average of three requests per second, with some bursts beyond the average allowed" per connection; plus a workspace-level pool shared across connections (numbers not published).
- **429 semantics:** error code `rate_limited`; "respect the `Retry-After` response header value, which is set as an integer number of seconds." HTTP 529 `service_overload` should be handled the same way.
- **Size limits (per request):** `text.content` and URLs 2000 chars; email/phone 200 chars; ≤100 elements per block/rich_text/multi_select/relation/people array; ≤1000 block elements and **500 KB** total payload.

**Reality check for this app:** an after-session burst is ~15 `POST /v1/pages` calls (one per player row). At the 3 rps average that is ~5 s if fully serialized; small bursts are explicitly tolerated. Each row is a handful of numbers/date/relation — nowhere near any size limit (relation arrays cap at 100 pages; the app uses 1). The official SDK **auto-retries 429 and 529 for all HTTP methods** with exponential back-off, "Respects the Retry-After header when present," default `maxRetries: 2` (configurable, `retry: false` to disable) — so the proxy gets retry handling for free, though it should still cap client-visible latency. — https://github.com/makenotion/notion-sdk-js (README)

## 6. CORS

The API reference documents no CORS support, and the Notion team said it outright on the official SDK repo. Notion team member @alicial (2021-06-01, makenotion/notion-sdk-js issue #96):

> "we currently don't support CORS and don't recommend making API calls from a web page."

— https://github.com/makenotion/notion-sdk-js/issues/96

The issue remains closed with no reversal; the developer docs contain no CORS-enabling statement as of 2026-07-11 (**no positive official doc page exists saying "no CORS"** — the primary evidence is the maintainer statement plus the absence of `Access-Control-Allow-Origin` headers reported there). The serverless proxy holding the token is therefore mandatory, which also matches Notion's key-handling guidance (token in env var, never client-side). — https://developers.notion.com/docs/best-practices-for-handling-api-keys

## 7. Official JS SDK (@notionhq/client)

Source: https://github.com/makenotion/notion-sdk-js (README + package.json on main).

- **Current version: v5.23.0** (major v5). v5.1.0+ supports `2025-09-03`; v5.12.0+ supports `2026-03-11`.
- **Data-source model: fully supported** — `notion.dataSources.query({ data_source_id, filter, ... })`, plus pagination helpers `iterateAllDataSourceRows()` / `collectAllDataSourceRows()`.
- **Default `Notion-Version` is `2025-09-03`** — pass `notionVersion: "2026-03-11"` in the `Client` constructor to pin the latest.
- **HTTP layer:** `package.json` has **zero runtime dependencies** and `engines: node >= 18`, i.e. it uses the runtime's native `fetch`; a custom `fetch` can be injected via the constructor. This makes it compatible with Vercel Node functions (Node 18+) out of the box. The README states the webhook-verification helpers run "unchanged on Node.js, Bun, Deno, Vercel Edge Functions, Cloudflare Workers" — the client itself is not explicitly certified for Edge runtime (**unconfirmed for Edge**; Node runtime on Vercel is the safe choice, and this app has no need for Edge).
- **Gotchas:** remember the default version is one behind; auto-retry defaults (2 retries, up to 60 s max delay) can exceed a serverless function's timeout if a long `Retry-After` arrives — set `maxRetries`/`maxRetryDelayMs` sensibly or bound the function timeout.

## 8. Latency and pagination for ~360 rows of history

- **Per-request latency is not documented anywhere on developers.notion.com** — no SLA or ballpark figure exists in the reference, request-limits page, or changelog (**unconfirmed by design**; any number would come from secondary sources). The only official throughput signal is the 3 rps average rate limit, which implies Notion expects request pacing on the order of hundreds of ms, not bulk throughput.
- **Pagination:** `page_size` "Default: 100, Maximum: 100" (https://developers.notion.com/reference/intro), cursor-based via `start_cursor`/`next_cursor`, and a query can paginate through at most 10,000 results (https://developers.notion.com/reference/query-a-data-source). Reading ~360 history rows therefore takes **4 sequential requests** (cursors can't be parallelized), i.e. roughly 4× single-request latency plus pacing — well within limits but slow enough that the charts view should fetch once and cache/aggregate in the app rather than re-query per chart. A season of ~360 rows stays far below the 10,000-result query cap.
