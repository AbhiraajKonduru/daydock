import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { anonymousVisitor, attachVisitorCookie, safeReferrer } from "@/lib/analyticsPrivacy";
import { convexInternalSecret, convexServerClient } from "@/lib/convexServer";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const referrer = safeReferrer((body as { referrer?: unknown }).referrer);
    const visitor = anonymousVisitor(request);
    await convexServerClient().mutation(api.analytics.recordPageView, {
      secret: convexInternalSecret(),
      visitorHash: visitor.hash,
      ...(referrer ? { referrer } : {}),
    });
    const response = new NextResponse(null, { status: 204 });
    attachVisitorCookie(response, visitor.newId);
    return response;
  } catch (error) {
    console.error("Could not record visit", error);
    return new NextResponse(null, { status: 204 });
  }
}
