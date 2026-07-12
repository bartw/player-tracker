import { NextRequest, NextResponse } from "next/server";
import { PatternMap } from "@/lib/domain";
import { fetchSessions, upsertSessionRow } from "@/lib/sessions";

export const dynamic = "force-dynamic";

interface LogEntry {
  playerId: string;
  playerName: string;
  absent: boolean;
  patterns: PatternMap;
  notes: string;
}

export async function POST(req: NextRequest) {
  try {
    const { date, entries } = (await req.json()) as { date: string; entries: LogEntry[] };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(entries)) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    // Upsert keyed on (player, date) so retries after a partial failure are safe.
    const existing = new Map(
      (await fetchSessions()).filter((r) => r.date === date).map((r) => [r.playerId, r.pageId]),
    );
    const results: Record<string, string> = {};
    for (const e of entries) {
      // Sequential on purpose: ~3 req/s Notion rate limit, SDK retries 429s.
      results[e.playerId] = await upsertSessionRow({
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
