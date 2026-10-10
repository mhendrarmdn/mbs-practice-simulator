# Changelog

## v1.2.4 — Chart, Form & Sidebar Reliability

### Navigation reliability
- Preserves sidebar/navigation scroll position across full application rerenders.
- Keeps the newly active menu item visible with nearest-scroll behavior.
- Adds extra navigation bottom padding so Performance / Practice Tools items do not feel covered by the Training Model footer.

### Product Image
- Auto-scales Quality and Image axes to the actual competitor range instead of anchoring at zero.
- Adds numeric axis ticks and market-average quadrant lines.
- Labels MARKOWITZ directly while competitor detail is available through native hover tooltips.
- Expands the useful plot area.

### Trend charts
- Revenue / Sales Status no longer plots Revenue and Net Profit on one misleading shared scale.
- With only R0, Revenue and Profit are shown as separate snapshot metrics.
- From two completed rounds onward, Revenue and Net Profit get separate trend charts.
- Sales Trend uses grouped operating bars at R0 and switches to a line chart only from two rounds onward.
- Future round tabs include “Belum dimainkan” tooltips and a visibly disabled treatment.

### Business Decisions
- Decision inputs use consistent US-style number formatting: 6.40 and 1,550,000.
- Units are moved into readable input prefixes/suffixes.
- Editable fields use a white background and stronger border.
- “Lock Draft” is renamed to “Freeze Editing” and separated conceptually from “Submit Round”.
- Adds short explanations for Freeze Editing, Submit Round, and Load R1 Reference.
- Moves Operating Position into a compact strip below the decision form to reduce the lopsided two-column layout.

### Typography
- Chart axes and legends use the same sans-serif family as the application with improved size and contrast.

### Database
- No Supabase schema migration required.

## v1.2.3 — Round Sync & Dashboard Readability

Latest-round synchronization, dashboard deltas, header round pill, and chart readability improvements.

## v1.2.2 — Parity Trust & UI Polish

Market-share consistency, full round tabs, KPI strip, delta column, icon standardization, and chart typography improvements.

## v1.2.1 — UI Stability Hotfix

Production CSS ordering and shell stability fixes.

## v1.2.0 — TopBoss Video Parity Pass

Recording-aligned information architecture and analytical pages based on the supplied contact sheets.
