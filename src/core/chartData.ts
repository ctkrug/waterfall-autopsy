import type { RequestRecord } from "./types";

export interface WaterfallBar {
  url: string;
  label: string;
  startMs: number;
  endMs: number;
}

// A short, readable label for the chart's y-axis: host + last path segment,
// since the full URL is usually too long to read at bar-chart scale.
export function shortLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split("/").filter(Boolean).pop();
    return segment ? `${parsed.host}/${segment}` : parsed.host;
  } catch {
    return url || "(unknown)";
  }
}

// Every request becomes a floating bar (Chart.js [start, end] range) so the
// waterfall shows the full timeline, not just the ranked offenders above it.
export function toWaterfallBars(records: RequestRecord[]): WaterfallBar[] {
  return records.map((record) => ({
    url: record.url,
    label: shortLabel(record.url),
    startMs: record.startMs,
    endMs: record.startMs + record.timeMs,
  }));
}
