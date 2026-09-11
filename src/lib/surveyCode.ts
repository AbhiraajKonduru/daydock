/**
 * Local Daydock survey codes. Generated on-device and checked in the browser
 * with this same public formula. Not a secret; forging a code is an accepted risk.
 *
 * Keep src/lib/surveyCode.ts and website/lib/surveyCode.ts identical.
 */

export const SURVEY_CODE_ALGORITHM_VERSION = 1;
export const SURVEY_CODE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const FUTURE_SKEW_MS = 2 * 60 * 60 * 1000;
const CHECKSUM_TAG = "daydock-code-v1";
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export type SurveyPlatform = "windows" | "macos" | "linux";

export type SurveyCodePayload = {
  algorithmVersion: number;
  generatedAt: number;
  platform: SurveyPlatform;
  appVersion: string;
};

const PLATFORMS: SurveyPlatform[] = ["windows", "macos", "linux"];

function fnv1a32(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let buffer = 0;
  let output = "";
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(buffer << (5 - bits)) & 31];
  return output;
}

function decodeBase32(value: string): Uint8Array | null {
  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];
  for (const character of value) {
    const index = ALPHABET.indexOf(character);
    if (index < 0) return null;
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 24) & 255;
  bytes[offset + 1] = (value >>> 16) & 255;
  bytes[offset + 2] = (value >>> 8) & 255;
  bytes[offset + 3] = value & 255;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0
  );
}

function parseVersion(version: string): [number, number, number] | null {
  const match = version.trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  const parts = match.slice(1, 4).map((part) => Number(part));
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return [parts[0], parts[1], parts[2]];
}

function checksumBytes(payload: Uint8Array): Uint8Array {
  const tag = new TextEncoder().encode(CHECKSUM_TAG);
  const tagged = new Uint8Array(tag.length + payload.length);
  tagged.set(tag);
  tagged.set(payload, tag.length);
  const hash = fnv1a32(tagged);
  return Uint8Array.from([(hash >>> 8) & 255, hash & 255]);
}

function groupCode(value: string): string {
  return value.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

export function normalizeSurveyCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0")
    .replace(/[^0-9A-Z]/g, "");
}

export function generateSurveyCode(input: {
  platform: SurveyPlatform;
  appVersion: string;
  generatedAt?: number;
  algorithmVersion?: number;
}): string {
  const algorithmVersion = input.algorithmVersion ?? SURVEY_CODE_ALGORITHM_VERSION;
  if (algorithmVersion !== SURVEY_CODE_ALGORITHM_VERSION) {
    throw new Error("Unsupported Daydock survey code version.");
  }
  const version = parseVersion(input.appVersion);
  if (!version) throw new Error("Daydock version is not a valid semver.");
  const generatedAt = input.generatedAt ?? Date.now();
  const payload = new Uint8Array(9);
  payload[0] = algorithmVersion;
  writeUint32(payload, 1, Math.floor(generatedAt / 1000));
  payload[5] = PLATFORMS.indexOf(input.platform) + 1;
  payload[6] = version[0];
  payload[7] = version[1];
  payload[8] = version[2];
  const bytes = new Uint8Array(11);
  bytes.set(payload);
  bytes.set(checksumBytes(payload), 9);
  return groupCode(encodeBase32(bytes));
}

export function parseSurveyCode(code: string, now = Date.now()): SurveyCodePayload | null {
  const normalized = normalizeSurveyCode(code);
  if (normalized.length < 16 || normalized.length > 20) return null;
  const bytes = decodeBase32(normalized);
  if (!bytes || bytes.length < 11) return null;
  const payload = bytes.slice(0, 9);
  const expected = checksumBytes(payload);
  if (bytes[9] !== expected[0] || bytes[10] !== expected[1]) return null;
  if (payload[0] !== SURVEY_CODE_ALGORITHM_VERSION) return null;
  const generatedAt = readUint32(payload, 1) * 1000;
  const platform = PLATFORMS[payload[5] - 1];
  if (!platform) return null;
  if (generatedAt > now + FUTURE_SKEW_MS) return null;
  if (now - generatedAt > SURVEY_CODE_MAX_AGE_MS) return null;
  return {
    algorithmVersion: payload[0],
    generatedAt,
    platform,
    appVersion: `${payload[6]}.${payload[7]}.${payload[8]}`,
  };
}
