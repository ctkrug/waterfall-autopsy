# Backlog — Waterfall Autopsy

Epics are ordered; stories within an epic are roughly ordered too. Every story has concrete,
checkable acceptance criteria — no "works well" vibes checks.

## Epic 1 — Core autopsy engine (the wow moment)

- [ ] **1.1 Drop a HAR, get the punch list** _(the wow moment — must work end to end first)_
  - Dropping or selecting a real HAR file (captured from Chrome DevTools' "Save all as HAR")
    renders a ranked list of offenders within 2 seconds, with no page reload.
  - Each punch-list entry shows a request kind, a plain-English one-line fix referencing its
    actual size/kind, and its byte size + time cost.
  - The top offender is visually distinguished from the rest of the list (per DESIGN.md's
    stamp treatment).

- [ ] **1.2 Expand the offender classifier**
  - Tracker detection covers at least 15 known analytics/ads/session-replay hosts, sourced
    from a documented list in the code (not inline magic strings scattered across files).
  - Render-blocking scripts (synchronous `<script>` requests that block first paint, inferred
    from timing position + mime type) are classified distinctly from async/deferred scripts.
  - Redirect chains (3xx responses) are attributed to the chain's total time cost, not
    counted as separate low-cost entries.

- [ ] **1.3 Handle malformed and edge-case HAR input without crashing**
  - Uploading a non-JSON file shows an inline error naming the problem in plain English; the
    app remains usable (no blank screen, no uncaught exception in the console).
  - A HAR with zero entries shows a designed empty state ("no requests captured"), not an
    empty punch list with no explanation.
  - A HAR entry missing optional fields (e.g. no `timings`, no `content.size`) is treated as
    zero-cost for that field rather than throwing.

- [ ] **1.4 Tune and document the cost-scoring formula**
  - The byte/time cost weighting is documented with a one-paragraph rationale in code
    comments or `docs/VISION.md`.
  - A regression test asserts a known slow-but-small request (high time, low bytes) can
    outrank a large-but-fast cached asset, proving the score isn't bytes-only.

## Epic 2 — Report depth and visualization

- [ ] **2.1 Supporting waterfall chart**
  - A Chart.js horizontal bar/timeline chart renders every request's start time and duration,
    positioned below/beside the punch list per DESIGN.md's layout (never above it).
  - Clicking a punch-list entry highlights its corresponding bar in the chart.

- [ ] **2.2 Third-party byte/time breakdown**
  - The summary panel shows total first-party vs. third-party byte share and time share as
    two distinct figures (not just a combined total).
  - At least one summary stat calls out the largest single contributor by host.

- [ ] **2.3 Design polish pass — report view**
  - Page matches `docs/DESIGN.md` tokens, type pairing, and layout intent at 390px, 768px,
    and 1440px widths with no horizontal scroll or overlap at any of them.
  - Every interactive element (drop zone, punch-list card, chart legend toggle) has themed
    hover, focus-visible, and active states — verified by tabbing through the full page.

## Epic 3 — Usability

- [ ] **3.1 Sample HAR for first-time users**
  - A "try a sample case" control loads a bundled example HAR and produces a full punch list
    without requiring the user to have their own file.
  - The sample is real enough to exercise at least three distinct offender kinds.

- [ ] **3.2 Copyable report output**
  - A "copy punch list" action puts a plain-text/Markdown version of the current punch list
    (rank, kind, fix, size) on the clipboard, verified by a visible confirmation state.

- [ ] **3.3 Loading and large-file handling**
  - Parsing a HAR with 1,000+ entries shows a designed loading state and completes without
    freezing the main thread for more than ~1 second (measured, not assumed).
  - A file that isn't a HAR at all (e.g. a `.png` renamed to `.har`) is rejected with the
    same plain-English error path as 1.3, not a different silent failure.

## Epic 4 — Ship hardening

- [ ] **4.1 Cross-browser HAR compatibility**
  - Test fixtures include at least one HAR export shape each from Chrome, Firefox, and
    Safari (or documented structural differences between them), and all three parse without
    error.

- [ ] **4.2 Accessibility pass**
  - Full keyboard navigation reaches every control (drop zone, punch-list cards, chart
    toggle, copy button) in a sane tab order with visible focus at each stop.
  - The error/status region uses `aria-live` so a screen reader announces parse errors and
    "report ready" without requiring focus to move.

- [ ] **4.3 Deploy readiness**
  - `npm run build` output loads correctly when served from a non-root subpath (e.g. via
    `vite preview --base=/waterfall-autopsy/` or an equivalent local check) — no broken
    asset paths.
  - README's usage section matches the actual UI (screenshot or accurate written walkthrough
    of the drop-a-HAR flow).
