# Vision — Waterfall Autopsy

## The problem

Every browser DevTools panel and third-party performance tool gives you a network waterfall:
rows of colored bars, one per request. It's accurate and it's useless on its own — you still
have to eyeball 150 rows, mentally cross-reference sizes and timings, and figure out which
handful of requests are actually worth fixing. That interpretation step is skipped by almost
every tool in this space; they measure and visualize, but they don't _conclude_.

Meanwhile HAR exports are everywhere — every browser can produce one in two clicks — but
almost nothing does more with a `.har` file than replay the same waterfall you'd get from
DevTools directly.

## Who it's for

A developer, or a non-specialist stakeholder (a PM, a designer) handed a HAR file after a
"the site feels slow" complaint, who wants an answer in under a minute, not a chart to
research. It should be useful to someone who has never heard of TTFB or LCP.

## The core idea

Parse the HAR, classify every request (hero image, tracker, render-blocking script, web font,
stylesheet, other), score each one's cost against total page load, and output a **ranked
punch list**: the top N offenders, each with what it is, how much it costs, and a specific
one-line fix — not a suggestion to "optimize images," but "compress or lazy-load this 4.2MB
JPEG." The chart is supporting evidence, not the product.

The bar for "is this a good punch-list entry": if a PM with no performance background reads
one line and immediately knows what engineering ticket to file, it's opinionated enough. If
it just restates a number, it isn't.

## Key design decisions

- **Client-side only, no backend.** A HAR file can contain sensitive URLs, cookies-adjacent
  headers, and internal hostnames. The only trustworthy default is "the file never leaves the
  browser." This also means zero hosting cost and it ships as a static site.
- **Punch list is the hero, waterfall is secondary.** The chart exists for someone who wants
  to verify the punch list against the raw timeline, not as the primary surface — see
  `docs/DESIGN.md` for the layout that enforces this.
- **A small, precise ruleset beats a large fuzzy one.** The tracker host list, mime-type
  classifiers, and cost formula are all deliberately narrow at v1 — false "you have a
  problem" verdicts erode trust faster than a missed edge case. Extending the ruleset is
  ongoing work, not a one-time pass.
- **Cost blends bytes and time, not just bytes.** A large cached asset and a small
  render-blocking script can both be real offenders; scoring on size alone misses the
  second case entirely.
- **Every fix is specific.** Fix text always references the concrete kind + size of the
  offending request, never generic advice like "optimize your assets."

## What "v1 done" looks like

- Drop any valid HAR 1.2 export (captured from Chrome, Firefox, or Safari) and get a punch
  list within a second or two, client-side, no upload.
- Malformed or non-HAR JSON produces a clear inline error, never a crash or a blank screen.
- The punch list correctly identifies and explains, in plain English, at least: oversized
  images, unoptimized/uncompressed responses, known third-party trackers, and render-blocking
  scripts.
- A supporting waterfall chart (Chart.js) is present for anyone who wants to cross-check the
  punch list against the raw timeline.
- The page matches `docs/DESIGN.md`'s direction end to end — this is a shipped product, not a
  prototype, and reads as intentionally designed rather than an unstyled tool.
- Ships as a static site with relative asset paths, buildable to a single output directory,
  deployable under any subpath.
