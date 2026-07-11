import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, sha256Hex } from "./lib/notion";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/api/unlock") return NextResponse.next();
  const pin = process.env.APP_PIN;
  if (!pin) return NextResponse.json({ error: "APP_PIN not configured" }, { status: 500 });
  const expected = await sha256Hex(pin);
  const got = req.cookies.get(AUTH_COOKIE)?.value;
  if (got !== expected) {
    return NextResponse.json({ error: "locked" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
