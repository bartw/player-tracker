// Server-side Notion I/O for players and session rows.
import { env, notionClient } from "./notion";
import { PATTERNS, PatternMap, SessionRow, canonical, parseEntry } from "./domain";

export interface Player { id: string; name: string }

type NotionPage = {
  id: string;
  properties: Record<string, {
    title?: { plain_text: string }[];
    rich_text?: { plain_text: string }[];
    date?: { start: string } | null;
    relation?: { id: string }[];
  }>;
};

function text(prop: NotionPage["properties"][string] | undefined): string {
  const parts = prop?.title ?? prop?.rich_text ?? [];
  return parts.map((p) => p.plain_text).join("");
}

async function queryAll(dataSourceId: string, body: Record<string, unknown> = {}): Promise<NotionPage[]> {
  const notion = notionClient();
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
      ...body,
    });
    pages.push(...(res.results as NotionPage[]));
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return pages;
}

export async function fetchPlayers(): Promise<Player[]> {
  const pages = await queryAll(env("NOTION_PLAYERS_DS_ID"));
  return pages
    .map((p) => ({ id: p.id, name: text(p.properties.Name) }))
    .filter((p) => p.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchSessions(): Promise<SessionRow[]> {
  const pages = await queryAll(env("NOTION_SESSIONS_DS_ID"));
  const rows: SessionRow[] = [];
  for (const page of pages) {
    const date = page.properties.Date?.date?.start?.slice(0, 10);
    const playerId = page.properties.Player?.relation?.[0]?.id;
    if (!date || !playerId) continue; // skeleton-test leftovers or hand-made rows
    const patterns: PatternMap = {};
    for (const pat of PATTERNS) {
      const parsed = parseEntry(text(page.properties[pat.label]));
      if (parsed) patterns[pat.id] = parsed;
    }
    rows.push({ pageId: page.id, playerId, date, patterns, notes: text(page.properties.Notes) });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function rowProperties(playerId: string, playerName: string, date: string, patterns: PatternMap, notes: string) {
  const props: Record<string, unknown> = {
    Name: { title: [{ text: { content: `${playerName} — ${date}` } }] },
    Player: { relation: [{ id: playerId }] },
    Date: { date: { start: date } },
    Notes: { rich_text: notes ? [{ text: { content: notes } }] : [] },
  };
  for (const pat of PATTERNS) {
    const e = patterns[pat.id];
    props[pat.label] = { rich_text: e ? [{ text: { content: canonical(e) } }] : [] };
  }
  return props;
}

/** Create or update the row for (player, date); archive it when absent. Returns what happened. */
export async function upsertSessionRow(opts: {
  playerId: string;
  playerName: string;
  date: string;
  absent: boolean;
  patterns: PatternMap;
  notes: string;
  existingPageId?: string;
}): Promise<"created" | "updated" | "archived" | "skipped"> {
  const notion = notionClient();
  const { playerId, playerName, date, absent, patterns, notes, existingPageId } = opts;
  if (absent) {
    if (!existingPageId) return "skipped";
    // API 2026-03-11 renamed `archived` to `in_trash` on page updates.
    await notion.pages.update({ page_id: existingPageId, in_trash: true } as never);
    return "archived";
  }
  if (existingPageId) {
    await notion.pages.update({
      page_id: existingPageId,
      properties: rowProperties(playerId, playerName, date, patterns, notes) as never,
    });
    return "updated";
  }
  await notion.pages.create({
    parent: { data_source_id: env("NOTION_SESSIONS_DS_ID") },
    properties: rowProperties(playerId, playerName, date, patterns, notes) as never,
  });
  return "created";
}
