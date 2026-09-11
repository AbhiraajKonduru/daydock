import { ConvexHttpClient } from "convex/browser";

export function convexServerClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  return new ConvexHttpClient(url);
}

export function convexInternalSecret(): string {
  const secret = process.env.CONVEX_INTERNAL_SECRET;
  if (!secret) throw new Error("CONVEX_INTERNAL_SECRET is not configured");
  return secret;
}
