import "./app.css";
import { analyze, type AutopsyReport } from "./core/analyze";
import { toWaterfallBars } from "./core/chartData";
import { formatPunchListMarkdown } from "./core/formatReport";
import { HarParseError, parseHar, toRequestRecords } from "./core/parseHar";
import type { RequestRecord } from "./core/types";
import { destroyWaterfallChart, renderWaterfallChart } from "./chart";
import { sampleCaseHar } from "./sampleCase";

const app = document.querySelector<HTMLDivElement>("#app")!;

// Without this, a file dropped anywhere outside the dropzone (or anywhere at
// all once a report is loaded and the dropzone no longer exists) triggers
// the browser's default behavior of navigating the tab to display the raw
// file — destroying the whole app. Registered once at module load, not
// inside render(), so it isn't re-added on every state change.
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => event.preventDefault());

// Tracks the toast's pending auto-hide so a fast follow-up render (e.g.
// highlighting a card while "Copied!" is still showing) replaces it instead
// of arming a second timer alongside a now-stale one.
let copyStatusTimer: ReturnType<typeof setTimeout> | undefined;

type CopyStatus = "idle" | "copied" | "failed";

interface AppState {
  records?: RequestRecord[];
  report?: AutopsyReport;
  error?: string;
  highlightUrl?: string;
  copyStatus?: CopyStatus;
  loading?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// HAR content (URLs, mime types) is untrusted input rendered via innerHTML —
// escape it so a crafted HAR can't inject markup into the page.
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// A screen-reader-only status announcement, separate from the visible
// loading/error text, so "report ready" is heard without moving focus.
function statusAnnouncement(state: AppState): string {
  if (state.loading) return "Analyzing case file.";
  if (state.report) return `Report ready — ${state.report.totalRequests} requests analyzed.`;
  return "";
}

function render(state: AppState) {
  destroyWaterfallChart();

  const hasChart = Boolean(state.report && state.report.totalRequests > 0 && state.records);

  app.innerHTML = `
    <header class="masthead">
      <span class="wordmark">Waterfall<em>Autopsy</em></span>
      <span class="tagline">the offenders, not the chart</span>
      ${state.report ? `<button type="button" class="new-case-btn">New case</button>` : ""}
    </header>
    <p class="sr-only" role="status" aria-live="polite">${escapeHtml(statusAnnouncement(state))}</p>
    <main class="layout">
      <section class="case-panel" aria-label="Case file summary">
        ${
          state.loading
            ? `<div class="loading-state" role="status" aria-live="polite">
                <span class="spinner" aria-hidden="true"></span>
                <p>Analyzing case file&hellip;</p>
              </div>`
            : state.report
              ? `<dl class="stats">
                <div><dt>Requests</dt><dd>${state.report.totalRequests}</dd></div>
                <div><dt>Total size</dt><dd>${formatBytes(state.report.totalBytes)}</dd></div>
                <div><dt>Total time</dt><dd>${Math.round(state.report.totalTimeMs)}ms</dd></div>
                ${
                  state.report.totalRequests > 0
                    ? `<div><dt>1st-party / 3rd-party size</dt><dd>${formatBytes(state.report.firstPartyBytes)} / ${formatBytes(state.report.thirdPartyBytes)}</dd></div>
                       <div><dt>1st-party / 3rd-party time</dt><dd>${Math.round(state.report.firstPartyTimeMs)}ms / ${Math.round(state.report.thirdPartyTimeMs)}ms</dd></div>
                       ${
                         state.report.largestHostContributor
                           ? `<div><dt>Top host</dt><dd>${escapeHtml(state.report.largestHostContributor.host)} (${formatBytes(state.report.largestHostContributor.bytes)})</dd></div>`
                           : ""
                       }`
                    : ""
                }
              </dl>`
              : `<div class="empty-state">
                <label class="dropzone" for="har-input">
                  <span>DROP .HAR TO OPEN CASE</span>
                  <input id="har-input" type="file" accept=".har,application/json" />
                </label>
                <button type="button" class="sample-case-btn">Try a sample case</button>
              </div>`
        }
        ${state.error ? `<p class="error" role="alert">${escapeHtml(state.error)}</p>` : ""}
        ${
          hasChart
            ? `<div class="chart-wrap">
                <canvas class="waterfall-chart" role="img" aria-label="Waterfall chart of every request's start time and duration"></canvas>
              </div>`
            : ""
        }
      </section>
      <section class="punch-list" aria-label="Offender punch list">
        ${
          state.report && state.report.totalRequests > 0
            ? `<div class="punch-list-toolbar">
                <button type="button" class="copy-report-btn" aria-live="polite">
                  ${state.copyStatus === "copied" ? "Copied!" : state.copyStatus === "failed" ? "Couldn't copy" : "Copy punch list"}
                </button>
              </div>`
            : ""
        }
        ${
          state.loading
            ? `<p class="empty-hint">Reading the case file&hellip;</p>`
            : state.report && state.report.totalRequests === 0
              ? `<p class="empty-hint">No requests captured in this HAR — there's nothing to autopsy.</p>`
              : state.report
                ? state.report.offenders
                    .map(
                      (o, i) => `
                <button
                  type="button"
                  class="offender-card ${i === 0 ? "top-offender" : ""} ${o.url === state.highlightUrl ? "is-highlighted" : ""}"
                  data-url="${escapeHtml(o.url)}"
                  aria-pressed="${o.url === state.highlightUrl}"
                >
                  ${i === 0 ? `<span class="stamp">TOP OFFENDER</span>` : ""}
                  <span class="kind">${escapeHtml(o.kind)}</span>
                  <p class="url">${escapeHtml(o.url)}</p>
                  <p class="fix">${escapeHtml(o.fix)}</p>
                  <p class="meta">${formatBytes(o.bytes)} · ${Math.round(o.timeMs)}ms</p>
                </button>`,
                    )
                    .join("")
                : `<p class="empty-hint">No case open yet. Drop a HAR file to generate the punch list.</p>`
        }
      </section>
    </main>
  `;

  if (hasChart && state.records) {
    const canvas = document.querySelector<HTMLCanvasElement>(".waterfall-chart");
    if (canvas) renderWaterfallChart(canvas, toWaterfallBars(state.records), state.highlightUrl);
  }

  const dropzone = document.querySelector<HTMLLabelElement>(".dropzone");
  const input = document.querySelector<HTMLInputElement>("#har-input");

  async function openCase(file: File) {
    render({ loading: true });
    try {
      const text = await file.text();
      // Yield to the browser so the loading state actually paints before the
      // synchronous parse/classify/rank work below runs on large HAR files.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const har = parseHar(text);
      const records = toRequestRecords(har);
      render({ records, report: analyze(records) });
    } catch (err) {
      render({ error: err instanceof HarParseError ? err.message : "Couldn't read that file." });
    }
  }

  input?.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) void openCase(file);
  });

  dropzone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("dropzone-active");
  });
  dropzone?.addEventListener("dragleave", () => {
    dropzone.classList.remove("dropzone-active");
  });
  dropzone?.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("dropzone-active");
    const file = event.dataTransfer?.files?.[0];
    if (file) void openCase(file);
  });

  document.querySelectorAll<HTMLButtonElement>(".offender-card").forEach((card) => {
    card.addEventListener("click", () => {
      const url = card.dataset.url;
      render({ ...state, highlightUrl: state.highlightUrl === url ? undefined : url });
    });
  });

  document.querySelector<HTMLButtonElement>(".sample-case-btn")?.addEventListener("click", () => {
    const records = toRequestRecords(sampleCaseHar);
    render({ records, report: analyze(records) });
  });

  document.querySelector<HTMLButtonElement>(".new-case-btn")?.addEventListener("click", () => {
    render({});
  });

  document.querySelector<HTMLButtonElement>(".copy-report-btn")?.addEventListener("click", () => {
    if (!state.report) return;
    const text = formatPunchListMarkdown(state.report);
    if (!navigator.clipboard) {
      render({ ...state, copyStatus: "failed" });
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => render({ ...state, copyStatus: "copied" }))
      .catch(() => render({ ...state, copyStatus: "failed" }));
  });

  clearTimeout(copyStatusTimer);
  if (state.copyStatus) {
    copyStatusTimer = setTimeout(() => render({ ...state, copyStatus: undefined }), 1800);
  }
}

render({});
