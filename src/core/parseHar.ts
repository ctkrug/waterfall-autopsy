import type { HarEntry, HarFile, RequestRecord } from "./types";

export class HarParseError extends Error {}

export function parseHar(raw: string): HarFile {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new HarParseError("That file isn't valid JSON — is it actually a .har export?");
  }

  if (
    typeof json !== "object" ||
    json === null ||
    !("log" in json) ||
    typeof (json as { log?: unknown }).log !== "object"
  ) {
    throw new HarParseError('Missing a top-level "log" object — this doesn\'t look like a HAR file.');
  }

  const log = (json as HarFile).log;
  if (!Array.isArray(log.entries)) {
    throw new HarParseError('HAR log has no "entries" array — nothing to analyze.');
  }

  return json as HarFile;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

function toRecord(entry: HarEntry, startMs: number): RequestRecord {
  const size = Math.max(entry.response?.content?.size ?? 0, 0);
  return {
    url: entry.request?.url ?? "",
    host: hostOf(entry.request?.url ?? ""),
    method: entry.request?.method ?? "GET",
    status: entry.response?.status ?? 0,
    mimeType: entry.response?.content?.mimeType ?? "application/octet-stream",
    bytes: size,
    timeMs: Math.max(entry.time ?? 0, 0),
    startMs,
  };
}

// Normalizes HAR entries into RequestRecords with start times relative to
// the first request, so downstream analysis doesn't need to parse dates.
export function toRequestRecords(har: HarFile): RequestRecord[] {
  const entries = har.log.entries;
  if (entries.length === 0) return [];

  const origin = Date.parse(entries[0].startedDateTime);
  return entries
    .map((entry) => {
      const started = Date.parse(entry.startedDateTime);
      const startMs = Number.isFinite(started) ? started - origin : 0;
      return toRecord(entry, startMs);
    })
    .sort((a, b) => a.startMs - b.startMs);
}
