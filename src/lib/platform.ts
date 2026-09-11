import { isTauri } from "@tauri-apps/api/core";
import { platform as tauriPlatform } from "@tauri-apps/plugin-os";

export type DesktopPlatform = "macos" | "windows" | "linux" | "other";

function browserPlatform(): DesktopPlatform {
  if (typeof navigator === "undefined") return "other";
  const value = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  if (value.includes("mac")) return "macos";
  if (value.includes("win")) return "windows";
  if (value.includes("linux")) return "linux";
  return "other";
}

function currentPlatform(): DesktopPlatform {
  if (typeof window !== "undefined" && isTauri()) {
    const value = tauriPlatform();
    if (value === "macos" || value === "windows" || value === "linux") return value;
  }
  return browserPlatform();
}

export const APP_PLATFORM = currentPlatform();
export const IS_MACOS = APP_PLATFORM === "macos";
