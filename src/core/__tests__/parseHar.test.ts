import { describe, expect, it } from "vitest";
import { HarParseError, parseHar, toRequestRecords } from "../parseHar";
import type { HarEntry, HarFile } from "../types";
import { sampleHar } from "./fixtures/sample.har";

function harEntry(overrides: Partial<HarEntry>): HarEntry {
  return {
    startedDateTime: "2026-01-01T00:00:00.000Z",
    time: 50,
    request: { method: "GET", url: "https://example.com/final" },
    response: {
      status: 200,
      content: { size: 1_000, mimeType: "text/html" },
      headersSize: 100,
      bodySize: 1_000,
    },
    timings: {},
    ...overrides,
  };
}

describe("parseHar", () => {
  it("parses valid HAR JSON", () => {
    const har = parseHar(JSON.stringify(sampleHar));
    expect(har.log.entries).toHaveLength(4);
  });

  it("rejects invalid JSON with a plain-English error", () => {
    expect(() => parseHar("not json")).toThrow(HarParseError);
  });

  it("rejects JSON that isn't a HAR file", () => {
    expect(() => parseHar(JSON.stringify({ foo: "bar" }))).toThrow(HarParseError);
  });
});

describe("toRequestRecords", () => {
  it("normalizes entries with origin-relative start times", () => {
    const records = toRequestRecords(sampleHar);
    expect(records).toHaveLength(4);
    expect(records[0].startMs).toBe(0);
    expect(records[1].startMs).toBeGreaterThan(0);
    expect(records[1].host).toBe("example.com");
  });

  it("folds a redirect chain's time into the resolved request, not as separate entries", () => {
    const har: HarFile = {
      log: {
        version: "1.2",
        entries: [
          harEntry({
            startedDateTime: "2026-01-01T00:00:00.000Z",
            time: 80,
            request: { method: "GET", url: "https://example.com/old" },
            response: { status: 301, content: { size: 0, mimeType: "" }, headersSize: 100, bodySize: 0 },
          }),
          harEntry({
            startedDateTime: "2026-01-01T00:00:00.080Z",
            time: 60,
            request: { method: "GET", url: "https://example.com/newer" },
            response: { status: 302, content: { size: 0, mimeType: "" }, headersSize: 100, bodySize: 0 },
          }),
          harEntry({
            startedDateTime: "2026-01-01T00:00:00.140Z",
            time: 40,
            request: { method: "GET", url: "https://example.com/final" },
            response: {
              status: 200,
              content: { size: 2_000, mimeType: "text/html" },
              headersSize: 100,
              bodySize: 2_000,
            },
          }),
        ],
      },
    };

    const records = toRequestRecords(har);
    expect(records).toHaveLength(1);
    expect(records[0].url).toBe("https://example.com/final");
    expect(records[0].timeMs).toBe(180);
    expect(records[0].startMs).toBe(0);
  });

  it("keeps the last hop of a redirect chain that never resolves", () => {
    const har: HarFile = {
      log: {
        version: "1.2",
        entries: [
          harEntry({
            request: { method: "GET", url: "https://example.com/dead-end" },
            response: { status: 301, content: { size: 0, mimeType: "" }, headersSize: 100, bodySize: 0 },
            time: 90,
          }),
        ],
      },
    };

    const records = toRequestRecords(har);
    expect(records).toHaveLength(1);
    expect(records[0].url).toBe("https://example.com/dead-end");
    expect(records[0].timeMs).toBe(90);
  });
});
