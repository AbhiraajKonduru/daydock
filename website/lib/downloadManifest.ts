export const CHANNEL_MANIFEST = "https://github.com/AbhiraajKonduru/daydock/releases/download/beta-channel/downloads.json";
const RELEASE_DOWNLOAD_PREFIX = "https://github.com/AbhiraajKonduru/daydock/releases/download/";

export const fallbackManifest = {
  version: "0.2.0",
  releasePage: "https://github.com/AbhiraajKonduru/daydock/releases/tag/v0.2",
  downloads: {
    windows: "https://github.com/AbhiraajKonduru/daydock/releases/download/v0.2/Daydock_0.2.0_x64-setup.exe",
    macos: "https://github.com/AbhiraajKonduru/daydock/releases/download/v0.2/Daydock_0.2.0_universal.dmg",
    linux: "https://github.com/AbhiraajKonduru/daydock/releases/download/v0.2/Daydock_0.2.0_amd64.AppImage",
  },
};

export type DownloadManifest = typeof fallbackManifest;
export type DownloadPlatform = keyof DownloadManifest["downloads"];

function isReleaseUrl(value: unknown, suffix?: string): value is string {
  return typeof value === "string" && value.startsWith(RELEASE_DOWNLOAD_PREFIX) && (!suffix || value.endsWith(suffix));
}

function validManifest(value: unknown): value is DownloadManifest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DownloadManifest>;
  return typeof candidate.version === "string"
    && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(candidate.version)
    && typeof candidate.releasePage === "string"
    && candidate.releasePage.startsWith("https://github.com/AbhiraajKonduru/daydock/releases/tag/")
    && Boolean(candidate.downloads)
    && isReleaseUrl(candidate.downloads?.windows, "-setup.exe")
    && isReleaseUrl(candidate.downloads?.macos, ".dmg")
    && isReleaseUrl(candidate.downloads?.linux, ".AppImage");
}

export async function getDownloadManifest(): Promise<{ manifest: DownloadManifest; source: string }> {
  try {
    const response = await fetch(CHANNEL_MANIFEST, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Beta channel returned ${response.status}`);
    const candidate: unknown = await response.json();
    if (!validManifest(candidate)) throw new Error("Beta channel manifest is invalid");
    return { manifest: candidate, source: "beta-channel" };
  } catch (error) {
    console.warn("Using fallback Daydock downloads", error);
    return { manifest: fallbackManifest, source: "fallback" };
  }
}
