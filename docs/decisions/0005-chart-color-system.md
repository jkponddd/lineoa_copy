# 0005: Chart color system

**Status:** Accepted
**Date:** 2026-09-22

## Context

The shadcn scaffold from Step 1 shipped `--chart-1` through `--chart-5` as placeholder tokens, but they were plain grayscale (`oklch(0.87 0 0)` down to `oklch(0.269 0 0)`) — no hue at all. That was fine while nothing used them; Reports/Analytics's first chart (messages per day, inbound vs. outbound) was the first real consumer.

## Decision

Adopted the dataviz skill's validated default categorical palette rather than inventing hex values by eye:

- `--chart-1`..`--chart-5` now hold the palette's first five slots (blue, orange, aqua, yellow, magenta), light and dark steps both filled in `globals.css`.
- Before using any pair of them, ran `validate_palette.js` against the app's actual light/dark surfaces — not assumed passing because the source palette is "validated" in the abstract. The blue/orange pair used by the messages chart cleared every check (CVD ΔE 24.7 light / 26.8 dark, well past the ≥8 floor).
- Charts elsewhere in the app should keep drawing from these same slots in the same fixed order (never re-ordered per chart, never a hue picked ad hoc) — that fixed ordering is the actual CVD-safety mechanism, not a cosmetic choice.

## Consequences

- Any future chart (Broadcast delivery stats, etc.) has a ready, pre-validated palette to draw from — just use the next unused slot(s) in order, and re-run the validator for that specific combination if it's a new pairing that hasn't been checked yet.
- Only slots 1-5 are filled; slots 6-8 (green, violet, red) from the skill's full 8-hue order aren't in `globals.css` yet — add them the same way if a chart needs more than 5 series.
- Status colors (success/warning/error) are intentionally a separate concern from this categorical palette — `--destructive` etc. stay as they are; the skill's own status palette wasn't adopted here since nothing in the app needed it yet.
