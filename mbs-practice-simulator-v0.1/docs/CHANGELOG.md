# Changelog

## v1.2.2 — Parity Trust & UI Polish

### Trust / consistency
- Fixes the Market Share mismatch between Business Summary and the pie chart.
- The user team's observed share is preserved exactly; competitor shares are proportionally fitted into the remaining market for the pie presentation.
- Adds share rank, market average, and gap versus average.
- Business Summary now includes delta versus the prior completed round.

### Round model
- Round tabs now show the full result path, including disabled future rounds.
- Competition / standard modes show their configured result horizon.
- Workbook mode shows R0–R5 plus a visible R6 Plan indicator; R6 remains planning-only, not a simulated result.
- Topbar round label remains mode-aware.

### Dashboard
- Adds a compact KPI strip for Practice NPV, Net Profit, Market Share, Cash, and Unit Cost.
- Single-round Revenue Trend is replaced by a clear R0 value and “Trend muncul setelah Round 1”.
- Trend chart left padding and axis readability are improved for two or more completed rounds.
- Net profit and round deltas use clearer positive/negative states.

### Navigation / typography
- Sidebar uses one consistent boxed-letter icon system instead of mixed symbols and letters.
- Header controls use the same sans-serif family as the rest of the interface.
- Redundant breadcrumb is removed from parity pages.
- Primary Next Decision action returns to a high-contrast yellow treatment.

### Market Share visualization
- MARKOWITZ receives the strongest visual emphasis.
- Competitors use quieter neutral colors.
- Legend values match the displayed market-share definition.

### Database
- No Supabase schema migration required.

## v1.2.1 — UI Stability Hotfix

Production CSS ordering and shell stability fixes.

## v1.2.0 — TopBoss Video Parity Pass

Recording-aligned information architecture and analytical pages based on the supplied contact sheets.

## v1.1.0 — UI Polish + Precision Pass

Header alignment, numeric precision, dashboard spacing, and sidebar polish.
