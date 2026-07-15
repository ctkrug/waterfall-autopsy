import { describe, expect, it } from "vitest";
import { analyze } from "../analyze";
import { toRequestRecords } from "../parseHar";
import type { RequestRecord } from "../types";
import { sampleHar } from "./fixtures/sample.har";

function record(overrides: Partial<RequestRecord>): RequestRecord {
  return {
    url: "https://example.com/asset",
    host: "example.com",
    method: "GET",
    status: 200,
    mimeType: "application/octet-stream",
    bytes: 1_000,
    timeMs: 10,
    startMs: 0,
    ...overrides,
  };
}

describe("analyze", () => {
  it("ranks the oversized hero image as the top offender", () => {
    const records = toRequestRecords(sampleHar);
    const report = analyze(records);

    expect(report.totalRequests).toBe(4);
    expect(report.offenders[0].kind).toBe("image");
    expect(report.offenders[0].url).toContain("hero.jpg");
    expect(report.offenders[0].fix).toMatch(/compress|lazy-load/i);
  });

  it("classifies a known analytics host as a tracker", () => {
    const records = toRequestRecords(sampleHar);
    const report = analyze(records);

    const tracker = report.offenders.find((o) => o.url.includes("google-analytics.com"));
    expect(tracker?.kind).toBe("tracker");
  });

  it("returns an empty report for no requests without throwing", () => {
    const report = analyze([]);
    expect(report.totalRequests).toBe(0);
    expect(report.offenders).toHaveLength(0);
  });
});

describe("analyze — cost formula blends bytes and time", () => {
  it("lets a slow-but-small request outrank a large-but-fast cached asset", () => {
    const records = [
      record({ url: "https://example.com/large-cached.bin", bytes: 70_000, timeMs: 50 }),
      record({ url: "https://example.com/slow-api.json", bytes: 30_000, timeMs: 950 }),
    ];
    const report = analyze(records);
    expect(report.offenders[0].url).toContain("slow-api.json");
  });
});

describe("analyze — render-blocking script classification", () => {
  it("classifies a script that starts before the first visual asset as render-blocking", () => {
    const records = [
      record({ url: "https://example.com/head.js", mimeType: "application/javascript", startMs: 0 }),
      record({ url: "https://example.com/photo.png", mimeType: "image/png", startMs: 50 }),
    ];
    const report = analyze(records);
    const script = report.offenders.find((o) => o.url.includes("head.js"));
    expect(script?.kind).toBe("render-blocking-script");
    expect(script?.fix).toMatch(/async|defer/i);
  });

  it("classifies a script that starts after the first visual asset as async/deferred", () => {
    const records = [
      record({ url: "https://example.com/photo.png", mimeType: "image/png", startMs: 0 }),
      record({ url: "https://example.com/late.js", mimeType: "application/javascript", startMs: 500 }),
    ];
    const report = analyze(records);
    const script = report.offenders.find((o) => o.url.includes("late.js"));
    expect(script?.kind).toBe("script");
  });
});
