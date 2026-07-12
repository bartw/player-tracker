import { Client } from "@notionhq/client";

export const NOTION_VERSION = "2026-03-11";

export function notionClient() {
  const auth = process.env.NOTION_TOKEN;
  if (!auth) throw new Error("NOTION_TOKEN is not set");
  return new Client({ auth, notionVersion: NOTION_VERSION });
}

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}
