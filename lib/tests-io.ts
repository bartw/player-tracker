// Server-only Notion I/O for test rows. Kept separate from lib/tests.ts so the
// client page can import the domain helpers without dragging the SDK into the bundle.
import { env, notionClient } from "./notion";
import { TEST_DEFS, TestValues, TestRow } from "./tests";

type NotionPage = {
  id: string;
  properties: Record<string, {
    title?: { plain_text: string }[];
    rich_text?: { plain_text: string }[];
    date?: { start: string } | null;
    relation?: { id: string }[];
    number?: number | null;
  }>;
};

export async function fetchTestRows(): Promise<TestRow[]> {
  const notion = notionClient();
  const rows: TestRow[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: env("NOTION_TESTS_DS_ID"),
      start_cursor: cursor,
      page_size: 100,
    });
    for (const page of res.results as NotionPage[]) {
      const date = page.properties.Date?.date?.start?.slice(0, 10);
      const playerId = page.properties.Player?.relation?.[0]?.id;
      if (!date || !playerId) continue;
      const values: TestValues = {};
      for (const def of TEST_DEFS) {
        const n = page.properties[def.label]?.number;
        if (n != null) values[def.id] = n;
      }
      rows.push({
        pageId: page.id, playerId, date, values,
        notes: (page.properties.Notes?.rich_text ?? []).map((t) => t.plain_text).join(""),
      });
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

/** Create or update the row for (player, date). Only provided values are written on update. */
export async function upsertTestRow(opts: {
  playerId: string;
  playerName: string;
  date: string;
  values: TestValues;
  existingPageId?: string;
}): Promise<"created" | "updated"> {
  const notion = notionClient();
  const { playerId, playerName, date, values, existingPageId } = opts;
  const numberProps = Object.fromEntries(
    TEST_DEFS.filter((d) => values[d.id] != null).map((d) => [d.label, { number: values[d.id] }]),
  );
  if (existingPageId) {
    await notion.pages.update({ page_id: existingPageId, properties: numberProps as never });
    return "updated";
  }
  await notion.pages.create({
    parent: { data_source_id: env("NOTION_TESTS_DS_ID") },
    properties: {
      Name: { title: [{ text: { content: `${playerName} — ${date}` } }] },
      Player: { relation: [{ id: playerId }] },
      Date: { date: { start: date } },
      ...numberProps,
    } as never,
  });
  return "created";
}
