# Changelog

## v1.2.3 — Round Sync & Dashboard Readability

### Round synchronization
- Fixes the dashboard defaulting to R0 after a newer round result already exists.
- Parity pages now default to the latest completed result unless the user explicitly selects an older round.
- This also activates the Δ vs prior column automatically after R1 and later results.

### Revenue Trend
- Adds point-value labels to each completed Revenue round.
- Adds a compact Net Profit companion strip under the Revenue chart.
- Keeps the R0-only placeholder behavior until a second completed round exists.

### Header
- Rebuilds the left side of the topbar as a true flex row.
- Raises the desktop header to 70px and vertically centers the hamburger and team name.
- Moves the current round into a high-contrast pill instead of a low-contrast line under the team name.

### Dashboard readability
- KPI sub-labels are larger and darker.
- Rank notes use semantic green / amber / red coloring.
- Practice NPV is emphasized in Business Summary.
- Chart axis labels, legends, and point labels use stronger contrast and larger text.

### Sidebar density
- Slightly reduces navigation spacing so more Analysis / Performance items fit before scrolling.

### Database
- No Supabase schema migration required.

## v1.2.2 — Parity Trust & UI Polish

Market-share consistency, full round tabs, KPI strip, delta column, icon standardization, and chart typography improvements.

## v1.2.1 — UI Stability Hotfix

Production CSS ordering and shell stability fixes.

## v1.2.0 — TopBoss Video Parity Pass

Recording-aligned information architecture and analytical pages based on the supplied contact sheets.
