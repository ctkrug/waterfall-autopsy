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

describe("analyze — first-party/third-party breakdown", () => {
  it("splits bytes and time between first-party and third-party hosts", () => {
    const records = [
      record({ url: "https://example.com/", host: "example.com", bytes: 1_000, timeMs: 100 }),
      record({ url: "https://cdn.example.com/app.js", host: "cdn.example.com", bytes: 500, timeMs: 50 }),
      record({ url: "https://tracker.io/pixel.gif", host: "tracker.io", bytes: 200, timeMs: 30 }),
    ];
    const report = analyze(records);

    expect(report.firstPartyBytes).toBe(1_500);
    expect(report.thirdPartyBytes).toBe(200);
    expect(report.firstPartyTimeMs).toBe(150);
    expect(report.thirdPartyTimeMs).toBe(30);
  });

  it("identifies the largest single contributor by host", () => {
    const records = [
      record({ url: "https://example.com/", host: "example.com", bytes: 1_000 }),
      record({ url: "https://tracker.io/a.js", host: "tracker.io", bytes: 200 }),
      record({ url: "https://tracker.io/b.js", host: "tracker.io", bytes: 5_000 }),
    ];
    const report = analyze(records);

    expect(report.largestHostContributor).toEqual({ host: "tracker.io", bytes: 5_200 });
  });

  it("returns zeroed totals and a null contributor for no requests", () => {
    const report = analyze([]);
    expect(report.firstPartyBytes).toBe(0);
    expect(report.thirdPartyBytes).toBe(0);
    expect(report.largestHostContributor).toBeNull();
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

describe("analyze — font classification and fix text", () => {
  it("classifies a font file by extension and recommends subsetting/preloading it", () => {
    const records = [record({ url: "https://example.com/brand.woff2", mimeType: "font/woff2" })];
    const report = analyze(records);
    expect(report.offenders[0].kind).toBe("font");
    expect(report.offenders[0].fix).toMatch(/subset|preload/i);
  });
});
