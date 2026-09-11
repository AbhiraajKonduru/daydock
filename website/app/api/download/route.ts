import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { anonymousVisitor, attachVisitorCookie } from "@/lib/analyticsPrivacy";
import { convexInternalSecret, convexServerClient } from "@/lib/convexServer";
import { getDownloadManifest, type DownloadPlatform } from "@/lib/downloadManifest";

const PLATFORMS = new Set<DownloadPlatform>(["windows", "macos", "linux"]);

export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("platform") as DownloadPlatform | null;
  if (!platform || !PLATFORMS.has(platform)) {
    return NextResponse.json({ error: "Choose Windows, macOS, or Linux." }, { status: 400 });
  }

  const { manifest } = await getDownloadManifest();
  const response = NextResponse.redirect(manifest.downloads[platform], 307);
  try {
    const visitor = anonymousVisitor(request);
    await convexServerClient().mutation(api.analytics.recordDownload, {
      secret: convexInternalSecret(),
      visitorHash: visitor.hash,
      platform,
      version: manifest.version,
    });
    attachVisitorCookie(response, visitor.newId);
  } catch (error) {
    console.error("Could not record download", error);
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
