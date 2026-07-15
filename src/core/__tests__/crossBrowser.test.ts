import { describe, expect, it } from "vitest";
import { parseHar, toRequestRecords } from "../parseHar";
import { chromeHar } from "./fixtures/chrome.har";
import { firefoxHar } from "./fixtures/firefox.har";
import { safariHar } from "./fixtures/safari.har";

// Real-world HAR exports diverge from the spec's happy path in
// browser-specific ways. See docs/ARCHITECTURE.md for the documented
// differences these fixtures encode.
describe("cross-browser HAR compatibility", () => {
  it("parses a Chrome DevTools export without error", () => {
    const har = parseHar(JSON.stringify(chromeHar));
    const records = toRequestRecords(har);
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.bytes >= 0 && r.timeMs >= 0)).toBe(true);
  });

  it("parses a Firefox Network Monitor export without a serverIPAddress", () => {
    const har = parseHar(JSON.stringify(firefoxHar));
    const records = toRequestRecords(har);
    expect(records).toHaveLength(2);
    expect(records[0].host).toBe("example.com");
  });

  it("parses a Safari export that reports -1 for unknown sizes as zero-cost", () => {
    const har = parseHar(JSON.stringify(safariHar));
    const records = toRequestRecords(har);
    expect(records).toHaveLength(2);
    // -1 (Safari's "unknown") must never surface as a negative byte count.
    expect(records.every((r) => r.bytes >= 0)).toBe(true);
    expect(records[1].bytes).toBe(0);
  });
});
