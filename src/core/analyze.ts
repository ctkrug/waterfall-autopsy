import type { RequestRecord } from "./types";
import { isTrackerHost } from "./trackers";

export type OffenderKind = "image" | "script" | "tracker" | "font" | "stylesheet" | "other";

export interface Offender {
  kind: OffenderKind;
  url: string;
  host: string;
  bytes: number;
  timeMs: number;
  fix: string;
}

export interface AutopsyReport {
  totalRequests: number;
  totalBytes: number;
  totalTimeMs: number;
  offenders: Offender[];
}

function classify(record: RequestRecord): OffenderKind {
  if (isTrackerHost(record.host)) return "tracker";
  if (record.mimeType.startsWith("image/")) return "image";
  if (record.mimeType.includes("javascript") || record.mimeType.includes("ecmascript")) return "script";
  if (record.mimeType.includes("font") || record.url.match(/\.(woff2?|ttf|otf|eot)(\?|$)/)) return "font";
  if (record.mimeType.includes("css")) return "stylesheet";
  return "other";
}

function fixFor(kind: OffenderKind, record: RequestRecord): string {
  const kb = Math.round(record.bytes / 1024);
  switch (kind) {
    case "image":
      return `Compress or lazy-load this ${kb}KB image — it's larger than most full pages.`;
    case "script":
      return `Defer or code-split this ${kb}KB script so it isn't blocking initial render.`;
    case "tracker":
      return `Load this third-party tracker async or drop it if it isn't essential.`;
    case "font":
      return `Subset or preload this font to cut render-blocking wait time.`;
    case "stylesheet":
      return `Split or defer this ${kb}KB stylesheet — inline only the critical CSS.`;
    default:
      return `Investigate why this ${kb}KB request is on the critical path.`;
  }
}

// Cost blends bytes and time so a huge-but-cached asset and a small-but-slow
// one can both surface — pure byte size alone misses render-blocking scripts.
function costOf(record: RequestRecord, totalBytes: number, totalTimeMs: number): number {
  const byteShare = totalBytes > 0 ? record.bytes / totalBytes : 0;
  const timeShare = totalTimeMs > 0 ? record.timeMs / totalTimeMs : 0;
  return byteShare * 0.6 + timeShare * 0.4;
}

export function analyze(records: RequestRecord[], topN = 10): AutopsyReport {
  const totalBytes = records.reduce((sum, r) => sum + r.bytes, 0);
  const totalTimeMs = records.reduce((sum, r) => sum + r.timeMs, 0);

  const offenders = records
    .map((record) => ({ record, kind: classify(record), cost: costOf(record, totalBytes, totalTimeMs) }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, topN)
    .map(({ record, kind }) => ({
      kind,
      url: record.url,
      host: record.host,
      bytes: record.bytes,
      timeMs: record.timeMs,
      fix: fixFor(kind, record),
    }));

  return {
    totalRequests: records.length,
    totalBytes,
    totalTimeMs,
    offenders,
  };
}
