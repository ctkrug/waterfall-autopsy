import type { AutopsyReport } from "./analyze";
import { formatBytes } from "./format";

// Plain-text/Markdown punch list for the "copy report" action — a ranked
// list a PM can paste straight into a ticket, not a JSON dump.
export function formatPunchListMarkdown(report: AutopsyReport): string {
  if (report.offenders.length === 0) {
    return "No offenders found — this HAR has no requests to autopsy.";
  }

  const lines = report.offenders.map(
    (o, i) => `${i + 1}. **${o.kind}** — ${o.fix} (${formatBytes(o.bytes)}, ${Math.round(o.timeMs)}ms)`,
  );

  return [`Culprit — punch list (${report.totalRequests} requests)`, "", ...lines].join("\n");
}
