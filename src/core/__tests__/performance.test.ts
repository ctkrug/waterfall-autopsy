import { describe, expect, it } from "vitest";
import { analyze } from "../analyze";
import { parseHar, toRequestRecords } from "../parseHar";
import type { HarFile } from "../types";

function largeHar(entryCount: number): HarFile {
  const start = Date.parse("2026-01-01T00:00:00.000Z");
  return {
    log: {
      version: "1.2",
      entries: Array.from({ length: entryCount }, (_, i) => ({
        startedDateTime: new Date(start + i * 5).toISOString(),
        time: 20 + (i % 50),
        request: { method: "GET", url: `https://cdn${i % 7}.example.com/asset-${i}.js` },
        response: {
          status: 200,
          content: { size: 1_000 + (i % 500), mimeType: "application/javascript" },
          headersSize: 100,
          bodySize: 1_000,
        },
        timings: {},
      })),
    },
  };
}

describe("full pipeline performance on a large HAR", () => {
  it("parses, normalizes, and analyzes 1,500 entries in well under a second", () => {
    const raw = JSON.stringify(largeHar(1_500));

    const start = performance.now();
    const har = parseHar(raw);
    const records = toRequestRecords(har);
    const report = analyze(records);
    const elapsedMs = performance.now() - start;

    expect(report.totalRequests).toBe(1_500);
    expect(elapsedMs).toBeLessThan(1_000);
  });
});
