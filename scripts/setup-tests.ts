/**
 * One-shot setup for the test tracker (wayfinder: .scratch/test-tracker/):
 * creates the "Test Results (app)" database under the program page and backfills
 * the baselines from the old Player Test Tracker as rows dated 2026-07-01.
 *
 * Needs in .env.local: NOTION_TOKEN, NOTION_PARENT_PAGE_ID, NOTION_PLAYERS_DS_ID.
 * Prints NOTION_TESTS_DS_ID for .env.local and the Vercel env vars.
 * Re-running creates a SECOND database — it does not check for existing ones.
 */
import { config } from "dotenv";
import { Client } from "@notionhq/client";

config({ path: ".env.local" });

const NOTION_VERSION = "2026-03-11";
const OLD_TESTS_DS = "cce10c7f-f519-40a1-9d57-99d3207a5f79";
const BASELINE_DATE = "2026-07-01";

// old wide-table column → new property name
const TESTS: { newProp: string; oldBL: string }[] = [
  { newProp: "Sprint (s)", oldBL: "Sprint BL (s)" },
  { newProp: "Jump (cm)", oldBL: "Jump BL (cm)" },
  { newProp: "Single Jump (cm)", oldBL: "Single Jump BL (cm)" },
  { newProp: "T-test (s)", oldBL: "T-test BL (s)" },
  { newProp: "Push-ups", oldBL: "Push BL" },
  { newProp: "Yo-Yo (m)", oldBL: "Yo-Yo BL (m)" },
];

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing — add it to .env.local`);
  return v;
}

type Page = { id: string; properties: Record<string, { title?: { plain_text: string }[]; number?: number | null }> };
const titleOf = (p: Page) =>
  Object.values(p.properties).find((v) => v.title)?.title?.map((t) => t.plain_text).join("") ?? "";

async function main() {
  const notion = new Client({ auth: env("NOTION_TOKEN"), notionVersion: NOTION_VERSION });

  console.log("Creating Test Results (app) database…");
  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: env("NOTION_PARENT_PAGE_ID") },
    title: [{ type: "text", text: { content: "Test Results (app)" } }],
    initial_data_source: {
      properties: {
        Name: { title: {} },
        Player: { relation: { data_source_id: env("NOTION_PLAYERS_DS_ID"), single_property: {} } },
        Date: { date: {} },
        ...Object.fromEntries(TESTS.map((t) => [t.newProp, { number: {} }])),
        Notes: { rich_text: {} },
      },
    },
  });
  const dsId = (db as unknown as { data_sources: { id: string }[] }).data_sources[0]?.id;
  if (!dsId) throw new Error("no data source on create-database response");
  console.log(`  database ${db.id} / data source ${dsId}`);

  console.log("Reading players and old baselines…");
  const players = (await notion.dataSources.query({ data_source_id: env("NOTION_PLAYERS_DS_ID"), page_size: 100 }))
    .results as Page[];
  const byName = new Map(players.map((p) => [titleOf(p), p.id]));
  const old = (await notion.dataSources.query({ data_source_id: OLD_TESTS_DS, page_size: 100 })).results as Page[];

  let created = 0;
  for (const row of old) {
    const name = titleOf(row);
    const playerId = byName.get(name);
    if (!playerId) {
      console.log(`  SKIP ${name} — no matching player in Players (app)`);
      continue;
    }
    const numbers = Object.fromEntries(
      TESTS.filter((t) => row.properties[t.oldBL]?.number != null)
        .map((t) => [t.newProp, { number: row.properties[t.oldBL].number }]),
    );
    if (Object.keys(numbers).length === 0) {
      console.log(`  SKIP ${name} — no baseline values`);
      continue;
    }
    await notion.pages.create({
      parent: { data_source_id: dsId },
      properties: {
        Name: { title: [{ text: { content: `${name} — ${BASELINE_DATE}` } }] },
        Player: { relation: [{ id: playerId }] },
        Date: { date: { start: BASELINE_DATE } },
        ...numbers,
      } as never,
    });
    created++;
    console.log(`  backfilled ${name} (${Object.keys(numbers).length} tests)`);
  }

  console.log(`\n${created} baseline rows created. Add to .env.local and Vercel env vars:\n`);
  console.log(`NOTION_TESTS_DS_ID=${dsId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
