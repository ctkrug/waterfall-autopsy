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

  it("rejects a non-HAR binary file (e.g. an image renamed to .har) via the same error path", () => {
    // A renamed .png read as text decodes to a PNG signature + binary noise —
    // never valid JSON, so it hits the same plain-English error as any other
    // malformed input rather than a distinct silent failure.
    const fakePngAsText = "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x01\x00";
    expect(() => parseHar(fakePngAsText)).toThrow(HarParseError);
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

  it("treats an entry missing optional fields as zero-cost rather than throwing", () => {
    const raw = JSON.stringify({
      log: {
        version: "1.2",
        entries: [
          {
            startedDateTime: "2026-01-01T00:00:00.000Z",
            time: 10,
            request: { method: "GET", url: "https://example.com/thin" },
            response: { status: 200 },
          },
        ],
      },
    });

    const har = parseHar(raw);
    expect(() => toRequestRecords(har)).not.toThrow();
    const [record] = toRequestRecords(har);
    expect(record.bytes).toBe(0);
    expect(record.mimeType).toBe("application/octet-stream");
  });

  it("treats a non-numeric size/time field as zero instead of propagating NaN", () => {
    // A hostile or corrupt HAR isn't schema-validated field-by-field — only
    // the top-level shape is — so a string where a number is expected must
    // degrade to zero-cost, not poison every downstream sum/sort with NaN.
    const raw = JSON.stringify({
      log: {
        version: "1.2",
        entries: [
          {
            startedDateTime: "2026-01-01T00:00:00.000Z",
            time: "not-a-number",
            request: { method: "GET", url: "https://example.com/thin" },
            response: { status: 200, content: { size: "also-not-a-number", mimeType: "text/plain" } },
          },
        ],
      },
    });

    const har = parseHar(raw);
    const [record] = toRequestRecords(har);
    expect(record.bytes).toBe(0);
    expect(record.timeMs).toBe(0);
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
