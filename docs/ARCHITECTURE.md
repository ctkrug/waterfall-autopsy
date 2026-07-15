# Architecture — Waterfall Autopsy

A quick orientation for anyone (including a future session) picking this codebase up cold.

## Data flow

```
.har file (drag/drop or file input, or the bundled sample case)
  → parseHar()        core/parseHar.ts   validates JSON + HAR shape, throws HarParseError
  → toRequestRecords() core/parseHar.ts   normalizes HAR entries into RequestRecord[],
                                          folding redirect chains and computing origin-
                                          relative start times
  → analyze()          core/analyze.ts    classifies every request, scores cost, ranks the
                                          top offenders, computes first/third-party +
                                          largest-host summary stats
  → render()            main.ts            renders the case-file UI from the resulting
                                           AutopsyReport, and feeds the same RequestRecord[]
                                           to the supporting Chart.js waterfall
```

Everything left of `render()` is pure, dependency-free TypeScript — no DOM, no Chart.js —
which is what makes it unit-testable in isolation. `main.ts` and `chart.ts` are the only
modules that touch the DOM/Chart.js.

## Modules

- `src/core/types.ts` — the HAR 1.2 shape (only the fields actually read) and the
  normalized `RequestRecord` the rest of the app reasons about.
- `src/core/parseHar.ts` — `parseHar(raw: string)` validates untrusted input and throws
  `HarParseError` with a plain-English message; `toRequestRecords(har)` normalizes entries,
  including folding 3xx redirect chains into the request that resolves them.
- `src/core/trackers.ts` — the documented, curated list of known tracker/analytics hosts
  (`isTrackerHost`). Extend this list directly rather than adding ad-hoc string checks.
- `src/core/analyze.ts` — the analysis engine: classifies each request (`image`,
  `render-blocking-script`, `script`, `tracker`, `font`, `stylesheet`, `other`), scores cost
  as a 0.6 byte-share / 0.4 time-share blend, ranks the top N offenders, and computes the
  first-party/third-party byte+time split plus the single largest host contributor.
- `src/core/chartData.ts` — pure transform from `RequestRecord[]` to Chart.js floating-bar
  data (`[startMs, endMs]` ranges) plus a shortened host+path label.
- `src/core/formatReport.ts` — `formatPunchListMarkdown()` renders an `AutopsyReport` as a
  ranked Markdown/plain-text list for the "copy punch list" clipboard action.
- `src/chart.ts` — owns the one live Chart.js instance; `renderWaterfallChart()` destroys
  the previous instance before creating a new one so repeated renders (new file, highlight
  toggle) don't leak canvas contexts.
- `src/sampleCase.ts` — a bundled example HAR (redirect chain, oversized image, tracker,
  render-blocking script, stylesheet) for the "try a sample case" control.
- `src/main.ts` — the whole UI: a single `render(state)` that re-renders `#app`'s innerHTML
  from an `AppState` (`records`, `report`, `error`, `highlightUrl`, `copyStatus`, `loading`)
  and re-attaches event listeners each render. No framework — deliberately small enough not
  to need one yet. `openCase()` renders a loading state and yields one animation frame before
  the synchronous parse/analyze pipeline runs, so large HAR files paint feedback instead of
  appearing to hang.

## Tests

`src/core/__tests__/*.test.ts` cover every pure module above via Vitest. `main.ts`/`chart.ts`
are exercised manually (Playwright-driven smoke pass during BUILD/QA), not by the automated
suite — there's no jsdom dependency yet.

## Cross-browser HAR differences

`fixtures/chrome.har.ts`, `firefox.har.ts`, and `safari.har.ts` encode the structural quirks
each browser's HAR export actually has, exercised by `crossBrowser.test.ts`:

- **Chrome** (DevTools "Save all as HAR"): the closest to spec-complete — full `timings`,
  `serverIPAddress`, plus Chrome-only `_initiator`/`connection` fields the analyzer ignores.
- **Firefox** (Network Monitor export): usually omits `serverIPAddress` and adds a `cache`
  object and `_securityState` field.
- **Safari** (Web Inspector export): reports `-1` ("unknown") for `content.size`,
  `headersSize`, and `bodySize` instead of omitting them, and ships a sparser `timings` object.

`parseHar.ts`'s `toRecord()` already guards every numeric field with `Math.max(value ?? 0, 0)`,
which absorbs both the missing-field pattern (Firefox/Chrome) and the negative-sentinel
pattern (Safari) without browser-specific branching.

## Running it

```bash
npm install
npm run dev         # local dev server
npm test            # vitest run
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # tsc --noEmit && vite build → dist/
```

## Deploy shape

`vite.config.ts` sets `base: "./"` — the build is relative-path, self-contained, and safe to
serve from a subpath (e.g. `apps.charliekrug.com/waterfall-autopsy/`), not just domain root.
