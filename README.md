# Waterfall Autopsy

[![CI](https://github.com/ctkrug/waterfall-autopsy/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/waterfall-autopsy/actions/workflows/ci.yml)

Drop in a `.har` network export and get an **autopsy report**, not a waterfall chart.

Most HAR viewers hand you a timeline and leave the interpretation to you. Waterfall Autopsy
parses the raw HAR JSON and does the interpretation itself: it names the specific images,
scripts, and third-party trackers that are actually costing you load time, ranks them by
impact, and writes a one-line fix for each — in plain English, not a chart you have to
squint at.

## Why

Performance tools are good at measurement and bad at opinion. Lighthouse tells you your LCP
is 4.1s; a waterfall chart shows you a wall of bars. Neither tells you, in one sentence,
_"this 4.2MB hero image and these 6 tracker scripts are 70% of your load time — fix these
first."_ That synthesis is the actual engineering problem this project solves.

## The wow moment

Drop a `.har` file onto the page (or click "try a sample case" if you don't have one handy).
Instead of a chart to interpret, you immediately get a prioritized punch list: the specific
offending requests, how much load time each one costs, and a one-line fix — ranked so the
biggest win is first, with a red case-stamp on the worst offender.

## What it does today

- **Drop or select a `.har` file** — parsed entirely client-side; the file never leaves your
  browser.
- **Ranked punch list** — every request classified as an oversized image, a known
  analytics/ads tracker (24 documented hosts), a render-blocking script, an async/deferred
  script, a font, or a stylesheet, each with a plain-English fix that names its actual size.
- **Cost scoring that isn't bytes-only** — ranks by a blend of byte share and time share, so
  a small-but-slow request can outrank a large-but-cached one.
- **Redirect-chain aware** — a 3xx chain's time is folded into the request that actually
  resolves it, instead of listing each hop as its own falsely-cheap entry.
- **Supporting waterfall chart** — a Chart.js timeline of every request's start/duration;
  click a punch-list card to highlight its bar.
- **First-party / third-party breakdown** — byte and time share split by party, plus the
  single largest contributing host.
- **Try a sample case** — no HAR handy? Load a bundled example and see the full report.
- **Copy the punch list** — one click puts a ranked Markdown version of the report on your
  clipboard, ready to paste into a ticket.
- **Handles malformed input and large files** — a non-JSON file, a non-HAR JSON file (or a
  renamed non-HAR file), or a HAR with zero entries all produce a plain-English message, never
  a blank screen or console error; large HARs (1,000+ entries) show a loading state and
  analyze in well under a second.

## Stack

TypeScript, [Chart.js](https://www.chartjs.org/) for visualization, [Vite](https://vitejs.dev/)
for the build, [Vitest](https://vitest.dev/) for tests. Ships as a static site with no
server-side component.

## Status

Core autopsy engine and report view are functionally complete. See
[`docs/VISION.md`](docs/VISION.md) for the full design, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for a module map, and [`docs/BACKLOG.md`](docs/BACKLOG.md) for what's left.

## Development

```bash
npm install
npm run dev       # local dev server
npm test          # run the test suite
npm run build     # production build to dist/
```

## License

MIT — see [LICENSE](LICENSE).
