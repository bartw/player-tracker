# Canonical string grammar over Notion structured selects

Pattern positions are stored as app-parsed rich text (`Hand-release push-up 3×6`, `Pull-up 5/4/3 yellow`) in Notion, not select/number properties, with the app as the sole writer and parser (`canonical()` / `parseEntry()` in `lib/domain.ts`). We chose this over Notion-native structured fields because the position grammar is compact, human-readable directly in Notion, and easier to evolve in app code than in Notion's schema editor — at the cost of the app owning the only valid parser for the data.
