/**
 * One-shot setup: creates the Players and Circuit Sessions databases in Notion.
 *
 * Order matters (relations point at a data source ID, so Players must exist first
 * — see .scratch/circuit-tracker-pwa/assets/notion-api-research.md).
 *
 * Needs in .env.local:
 *   NOTION_TOKEN=ntn_…            (internal integration, shared with the parent page)
 *   NOTION_PARENT_PAGE_ID=…       (page the databases are created under)
 *
 * Prints the data-source IDs to put back into .env.local / Vercel env vars.
 * Safe to re-run only if you want a SECOND set of databases — it does not check for existing ones.
 */
import "dotenv/config";
import { config } from "dotenv";
import { Client } from "@notionhq/client";

config({ path: ".env.local" });

const NOTION_VERSION = "2026-03-11";
const PLAYERS = ["Linus Wijnants", "Lars Goris", "Finn Pallen", "Tijs Koninckx", "Senn Dols"];
const PATTERNS = ["H-push", "H-pull", "V-push", "V-pull", "SL-hinge", "SL-squat"];

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing — add it to .env.local`);
  return v;
}

function firstDataSourceId(db: unknown): string {
  const d = db as { id: string; data_sources?: { id: string }[] };
  const ds = d.data_sources?.[0]?.id;
  if (!ds) throw new Error(`create-database response for ${d.id} has no data_sources`);
  return ds;
}

async function main() {
  const notion = new Client({ auth: env("NOTION_TOKEN"), notionVersion: NOTION_VERSION });
  const parent = { type: "page_id" as const, page_id: env("NOTION_PARENT_PAGE_ID") };

  console.log("Creating Players database…");
  const playersDb = await notion.databases.create({
    parent,
    title: [{ type: "text", text: { content: "Players (app)" } }],
    initial_data_source: {
      properties: {
        Name: { title: {} },
      },
    },
  });
  const playersDsId = firstDataSourceId(playersDb);
  console.log(`  database ${playersDb.id} / data source ${playersDsId}`);

  console.log("Seeding players…");
  for (const name of PLAYERS) {
    await notion.pages.create({
      parent: { data_source_id: playersDsId },
      properties: { Name: { title: [{ text: { content: name } }] } },
    });
    console.log(`  ${name}`);
  }

  console.log("Creating Circuit Sessions database…");
  const patternProps = Object.fromEntries(PATTERNS.map((p) => [p, { rich_text: {} }]));
  const sessionsDb = await notion.databases.create({
    parent,
    title: [{ type: "text", text: { content: "Circuit Sessions (app)" } }],
    initial_data_source: {
      properties: {
        Name: { title: {} },
        Player: { relation: { data_source_id: playersDsId, single_property: {} } },
        Date: { date: {} },
        Absent: { checkbox: {} },
        ...patternProps,
        Notes: { rich_text: {} },
      },
    },
  });
  const sessionsDsId = firstDataSourceId(sessionsDb);
  console.log(`  database ${sessionsDb.id} / data source ${sessionsDsId}`);

  console.log("\nAdd these to .env.local and the Vercel project env vars:\n");
  console.log(`NOTION_PLAYERS_DS_ID=${playersDsId}`);
  console.log(`NOTION_SESSIONS_DS_ID=${sessionsDsId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
