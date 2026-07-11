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

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const AUTH_COOKIE = "ct_auth";
