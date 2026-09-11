import { createHash, randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const VISITOR_COOKIE = "daydock_visitor";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function anonymousVisitor(request: NextRequest): { hash: string; newId?: string } {
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const id = existing && /^[0-9a-f-]{36}$/i.test(existing) ? existing : randomUUID();
  const salt = process.env.ANALYTICS_SALT;
  if (!salt) throw new Error("ANALYTICS_SALT is not configured");
  return {
    hash: createHash("sha256").update(`${salt}:${id}`).digest("hex"),
    newId: existing ? undefined : id,
  };
}

export function attachVisitorCookie(response: NextResponse, id?: string) {
  if (!id) return;
  response.cookies.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR,
    path: "/",
  });
}

export function safeReferrer(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname.slice(0, 160) || undefined;
  } catch {
    return undefined;
  }
}
