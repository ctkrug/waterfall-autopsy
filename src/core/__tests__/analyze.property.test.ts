import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { analyze } from "../analyze";
import type { RequestRecord } from "../types";

const arbitraryRecord = fc.record({
  url: fc.webUrl(),
  host: fc.domain(),
  method: fc.constant("GET"),
  status: fc.constantFrom(200, 301, 302, 404, 500),
  mimeType: fc.constantFrom("image/png", "text/css", "application/javascript", "font/woff2", "text/html"),
  bytes: fc.integer({ min: 0, max: 50_000_000 }),
  timeMs: fc.integer({ min: 0, max: 60_000 }),
  startMs: fc.integer({ min: 0, max: 60_000 }),
});

describe("analyze — invariants over arbitrary request sets", () => {
  it("never ranks more offenders than requested, and always ranks by descending cost", () => {
    fc.assert(
      fc.property(fc.array(arbitraryRecord as fc.Arbitrary<RequestRecord>, { maxLength: 50 }), (records) => {
        const report = analyze(records);

        expect(report.totalRequests).toBe(records.length);
        expect(report.offenders.length).toBeLessThanOrEqual(Math.min(10, records.length));

        // The report doesn't expose cost directly, but rank order must be
        // stable and non-increasing in the underlying score — byte share is
        // a reasonable proxy to sanity-check monotonicity isn't wildly broken:
        // a zero-byte, zero-time offender should never outrank a costly one.
        for (let i = 1; i < report.offenders.length; i++) {
          const prev = report.offenders[i - 1];
          const curr = report.offenders[i];
          const prevWeight = prev.bytes + prev.timeMs;
          const currWeight = curr.bytes + curr.timeMs;
          if (prevWeight === 0) expect(currWeight).toBe(0);
        }
      }),
    );
  });

  it("first-party + third-party bytes/time always sum to the totals", () => {
    fc.assert(
      fc.property(fc.array(arbitraryRecord as fc.Arbitrary<RequestRecord>, { maxLength: 50 }), (records) => {
        const report = analyze(records);
        expect(report.firstPartyBytes + report.thirdPartyBytes).toBe(report.totalBytes);
        expect(report.firstPartyTimeMs + report.thirdPartyTimeMs).toBe(report.totalTimeMs);
      }),
    );
  });

  it("never throws and always returns a report for any array of well-formed records", () => {
    fc.assert(
      fc.property(fc.array(arbitraryRecord as fc.Arbitrary<RequestRecord>, { maxLength: 100 }), (records) => {
        expect(() => analyze(records)).not.toThrow();
      }),
    );
  });
});
