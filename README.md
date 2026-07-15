# Waterfall Autopsy

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

Drop a `.har` file onto the page. Instead of a chart to interpret, you immediately get a
prioritized punch list: the specific offending requests, how much load time each one costs,
and a one-line fix — ranked so the biggest win is first.

## Planned features

- **HAR parsing** — robust ingestion of the HAR 1.2 format, tolerant of the quirks different
  browsers/proxies produce.
- **Opinionated analysis engine** — rules that classify requests (hero image, tracker,
  render-blocking script, web font, etc.), score their cost against total load time, and
  generate a human-readable verdict + fix per offender.
- **Punch list report** — the primary UI: a ranked list of offenders with plain-English
  summaries, not a raw chart.
- **Supporting waterfall view** — a Chart.js visualization for context, secondary to the
  punch list.
- **Zero-backend** — runs entirely client-side; a HAR file never leaves the browser.

## Stack

TypeScript, [Chart.js](https://www.chartjs.org/) for visualization, [Vite](https://vitejs.dev/)
for the build, [Vitest](https://vitest.dev/) for tests. Ships as a static site with no
server-side component.

## Status

Early scaffold. See [`docs/VISION.md`](docs/VISION.md) for the full design and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for the build plan.

## Development

```bash
npm install
npm run dev       # local dev server
npm test          # run the test suite
npm run build     # production build to dist/
```

## License

MIT — see [LICENSE](LICENSE).
