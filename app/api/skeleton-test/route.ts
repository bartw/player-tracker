import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, env, notionClient, sha256Hex } from "@/lib/notion";

// Walking-skeleton proof: POST writes one Circuit Sessions row, GET reads the latest back.

async function assertUnlocked(req: NextRequest) {
  // Defense in depth: middleware already checks, handlers re-check.
  const got = req.cookies.get(AUTH_COOKIE)?.value;
  if (got !== (await sha256Hex(env("APP_PIN")))) throw new Error("locked");
}

export async function POST(req: NextRequest) {
  try {
    await assertUnlocked(req);
    const notion = notionClient();
    const playersDs = env("NOTION_PLAYERS_DS_ID");
    const sessionsDs = env("NOTION_SESSIONS_DS_ID");

    const players = await notion.dataSources.query({
      data_source_id: playersDs,
      page_size: 1,
    });
    if (players.results.length === 0) {
      return NextResponse.json({ error: "no players — run setup script" }, { status: 500 });
    }
    const player = players.results[0] as { id: string };
    const today = new Date().toISOString().slice(0, 10);

    const page = await notion.pages.create({
      parent: { data_source_id: sessionsDs },
      properties: {
        Name: { title: [{ text: { content: `Skeleton test — ${today}` } }] },
        Player: { relation: [{ id: player.id }] },
        Date: { date: { start: today } },
        "H-push": { rich_text: [{ text: { content: "Skeleton test 1×1" } }] },
        Notes: { rich_text: [{ text: { content: "Written by the walking skeleton. Safe to delete." } }] },
      },
    });
    return NextResponse.json({ ok: true, pageId: page.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: msg === "locked" ? 401 : 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await assertUnlocked(req);
    const notion = notionClient();
    const res = await notion.dataSources.query({
      data_source_id: env("NOTION_SESSIONS_DS_ID"),
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 1,
    });
    const page = res.results[0] as
      | { id: string; properties: Record<string, unknown>; created_time: string }
      | undefined;
    if (!page) return NextResponse.json({ ok: true, latest: null });
    return NextResponse.json({
      ok: true,
      latest: { id: page.id, created: page.created_time, properties: page.properties },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: msg === "locked" ? 401 : 500 });
  }
}
