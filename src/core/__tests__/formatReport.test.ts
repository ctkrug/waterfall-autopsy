import { describe, expect, it } from "vitest";
import { analyze } from "../analyze";
import { formatPunchListMarkdown } from "../formatReport";
import { toRequestRecords } from "../parseHar";
import { sampleHar } from "./fixtures/sample.har";

describe("formatPunchListMarkdown", () => {
  it("renders a ranked, numbered line per offender with size and time", () => {
    const report = analyze(toRequestRecords(sampleHar));
    const text = formatPunchListMarkdown(report);

    expect(text).toContain("1. **image**");
    expect(text).toMatch(/\(\d+(\.\d+)?(B|KB|MB), \d+ms\)/);
    expect(text).toContain(`${report.totalRequests} requests`);
  });

  it("orders lines to match the report's offender ranking", () => {
    const report = analyze(toRequestRecords(sampleHar));
    const text = formatPunchListMarkdown(report);
    const lines = text.split("\n").filter((line) => /^\d+\./.test(line));

    expect(lines).toHaveLength(report.offenders.length);
    report.offenders.forEach((offender, i) => {
      expect(lines[i]).toContain(offender.kind);
    });
  });

  it("returns a plain explanatory line for a report with no offenders", () => {
    const text = formatPunchListMarkdown(analyze([]));
    expect(text).toBe("No offenders found — this HAR has no requests to autopsy.");
  });

  it("formats a sub-1KB offender's size in bytes, not a KB decimal", () => {
    const records = [
      {
        url: "https://example.com/tiny.gif",
        host: "example.com",
        method: "GET",
        status: 200,
        mimeType: "image/gif",
        bytes: 43,
        timeMs: 5,
        startMs: 0,
      },
    ];
    const text = formatPunchListMarkdown(analyze(records));
    expect(text).toContain("(43B, 5ms)");
  });
});
