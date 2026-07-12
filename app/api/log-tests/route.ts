import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, env, sha256Hex } from "@/lib/notion";
import { TestValues } from "@/lib/tests";
import { fetchTestRows, upsertTestRow } from "@/lib/tests-io";

export const dynamic = "force-dynamic";

interface LogTestEntry {
  playerId: string;
  playerName: string;
  values: TestValues; // only the tests actually measured — blanks are simply absent
}

export async function POST(req: NextRequest) {
  try {
    if (req.cookies.get(AUTH_COOKIE)?.value !== (await sha256Hex(env("APP_PIN")))) {
      return NextResponse.json({ error: "locked" }, { status: 401 });
    }
    const { date, entries } = (await req.json()) as { date: string; entries: LogTestEntry[] };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(entries)) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    // Upsert keyed on (player, date): merging values into an existing row makes saving
    // station-by-station safe — each test's save only touches the columns it measured.
    const existing = new Map(
      (await fetchTestRows()).filter((r) => r.date === date).map((r) => [r.playerId, r.pageId]),
    );
    const results: Record<string, string> = {};
    for (const e of entries) {
      if (Object.keys(e.values).length === 0) continue; // nothing measured for this player
      results[e.playerId] = await upsertTestRow({
        ...e,
        date,
        existingPageId: existing.get(e.playerId),
      });
    }
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
