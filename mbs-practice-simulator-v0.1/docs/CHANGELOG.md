# Changelog

## v1.2.5 — Chart Trust & Automatic Debrief

### Money formatting
- Fixes negative currency formatting globally from `$-434,646` to `-$434,646`.
- The corrected format now propagates to charts, tables, KPIs, financial statements, and debriefs.

### Sales / Revenue charts
- Adds rounded, decision-friendly Y-axis ticks.
- Revenue trend uses $1M increments.
- Net Profit trend uses $250k increments and now has an emphasized $0 break-even line.
- Negative-profit region receives a subtle red background.
- Single-series Revenue / Net Profit charts no longer waste space on redundant legends.
- Sales Trend uses $/unit-independent volume ticks at 250k increments.
- Sales Trend labels only the latest point for each series to avoid overlap; hover retains exact values for every point.

### Automatic debrief
- Sales Trend now calculates the demand gap for the selected round.
- It reports lost sales units, lost-demand percentage, supply coverage, and carry-in finished-goods usage when supported by the round history.

### Product Image
- Replaces awkward arbitrary ticks with rounded market-scaled axes.
- Quality uses clean 0.10 steps; Image uses clean 0.10 steps anchored to 0.05.
- Competitor points are numbered and match the new # column in the table.
- Company Position adds Δ Quality vs market average and Δ Image vs market average.
- Adds clearer market-average labels and four quadrant labels.
- Keeps hover details for every competitor.

### Company Revenue Status
- Adds revenue rank and sorts companies from highest to lowest revenue.
- The user's row remains highlighted.

### Sidebar
- Makes the navigation list the dedicated scrolling region.
- Adds extra bottom scroll room so Leaderboard and Room & Setup cannot be hidden behind the Training Model footer.

### Database
- No Supabase schema migration required.

## v1.2.4 — Chart, Form & Sidebar Reliability

Sidebar scroll preservation, Product Image scaling, decision input formatting, and trend-chart cleanup.

## v1.2.3 — Round Sync & Dashboard Readability

Latest-round synchronization, dashboard deltas, header round pill, and chart readability improvements.

## v1.2.2 — Parity Trust & UI Polish

Market-share consistency, full round tabs, KPI strip, delta column, icon standardization, and chart typography improvements.
