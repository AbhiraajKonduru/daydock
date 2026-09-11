export const UPDATE_DEFER_KEY = "daydock-update-deferred";
export const UPDATE_DEFER_MS = 24 * 60 * 60 * 1000;

type DeferredUpdate = {
  version: string;
  until: number;
};

export function deferredUpdateValue(version: string, now = Date.now()): string {
  return JSON.stringify({ version, until: now + UPDATE_DEFER_MS } satisfies DeferredUpdate);
}

export function isUpdateDeferred(version: string, serialized: string | null, now = Date.now()): boolean {
  if (!serialized) return false;
  try {
    const deferred = JSON.parse(serialized) as Partial<DeferredUpdate>;
    return deferred.version === version
      && typeof deferred.until === "number"
      && Number.isFinite(deferred.until)
      && deferred.until > now;
  } catch {
    return false;
  }
}
