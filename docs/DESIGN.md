# Design direction — Waterfall Autopsy

## 1. Aesthetic direction

**Forensic case file.** The product's own name is "autopsy" — lean into it literally instead
of building another dark-mode dev-tool dashboard. The page reads like a case file pulled from
a manila folder: warm paper background, typewriter case-stamp headlines, monospace data rows,
and a red ink stamp that lands on the worst offender when a report finishes. This is a
deliberate departure from the glassy-dark/terminal-mono look most performance tools default
to — it fits a tool whose entire pitch is "we did the interpretation for you," which reads as
a completed investigation, not a live dashboard.

## 2. Tokens

| Token              | Value     | Use                                              |
| ------------------ | --------- | ------------------------------------------------ |
| `--bg`             | `#F4EFE6` | page background — warm paper cream               |
| `--surface-1`      | `#FFFFFF` | index-card surfaces (offender cards, panels)     |
| `--surface-2`      | `#E9E0C8` | manila-folder tan — section bands, the drop zone |
| `--text`           | `#211D18` | body/ink text                                    |
| `--text-muted`     | `#6A6052` | captions, metadata, typewriter-faded labels      |
| `--accent`         | `#B3241C` | case-stamp red — critical offenders, primary CTA |
| `--accent-support` | `#2B4A3E` | evidence-tag green — secondary badges, links     |
| `--success`        | `#2E6E45` | "fixed"/low-cost states                          |
| `--danger`         | `#8C1913` | darker stamp red — errors, invalid file          |

- **Type pairing:** Display — [Special Elite](https://fonts.google.com/specimen/Special+Elite)
  (typewriter, case-stamp headlines, the wordmark). UI/data — [IBM Plex
  Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) (byte counts, timings, URLs, body
  copy) — monospace throughout keeps every number column-aligned, which matters for a report
  full of KB/ms figures. System fallbacks: `Georgia, serif` for display, `"SF Mono", Consolas,
monospace` for UI.
- **Spacing unit:** 8px scale (8/16/24/32/48/64).
- **Corner radius:** 2px — sharp, paper-edge, not the rounded-pill default.
- **Shadow:** layered soft paper shadow (`0 1px 2px rgba(33,29,24,.08), 0 4px 12px
rgba(33,29,24,.10)`); offender cards get a very slight alternating rotation (±0.6deg) like
  index cards pinned to a board, straightening to 0deg on hover.
- **Motion:** UI transitions 150–220ms ease-out. The stamp animation (see below) is a punchier
  180ms scale+rotate-in with a small overshoot.

## 3. Layout intent

**Hero = the punch list.** The ranked offender cards are the product; the supporting Chart.js
waterfall is secondary and sits below or beside it, never above it.

- **Desktop (1440×900):** A fixed top strip (~80px) with the wordmark + a compact summary
  read-out (requests / total size / total time). Below it, a two-column layout: left column
  (~30%, `--surface-2` band) holds the drop zone when empty or the summary + supporting
  waterfall chart once a report exists; right column (~70%) is the scrollable punch list of
  offender cards — this is the ~60%+-of-viewport hero.
- **Phone (390×844):** Single column. Summary read-out collapses to a horizontal-scroll strip
  of 3 stat chips. Drop zone becomes a full-width band. Offender cards stack full width below.
- **Empty state:** the left/top area is a large case-file drop zone (dashed folder outline,
  "DROP .HAR TO OPEN CASE" in the typewriter font) — never a tiny bare `<input>`.

## 4. Signature detail

When a report finishes analyzing, the top offender's card gets a red ink stamp
("CRITICAL" or "TOP OFFENDER") that animates in — scaled up from 1.4x with a slight rotation
settle, like a physical rubber stamp hitting paper — accompanied by a subtle paper-texture
grain overlay on the page background (a low-opacity SVG noise filter) so surfaces never read
as flat digital color.

## 5. Games/toys juice plan

Not applicable — Waterfall Autopsy is a data tool, not a game. (Motion/feedback rules under
D2 of the shared design standard still apply: every control gets hover/focus/active states,
and the stamp/report-complete moment gets a real transition rather than an instant swap.)
