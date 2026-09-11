import { NextResponse } from "next/server";
import { getDownloadManifest } from "@/lib/downloadManifest";

export async function GET() {
  const { manifest, source } = await getDownloadManifest();

  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      "X-Daydock-Download-Source": source,
    },
  });
}
