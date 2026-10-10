# Changelog

## v1.0.0 — TopBoss Workflow Parity + Full Financials

### Navigation / sidebar
- Added hamburger menu.
- Sidebar can be collapsed and reopened.
- Desktop supports compact icon-only sidebar.
- Mobile uses an off-canvas sidebar + scrim.
- Added grouped Management / Status / Analysis / Performance navigation.
- Sidebar preference persists locally.

### Financial Statement
- Replaced simplified snapshot cards with three full panels:
  - Balance Sheet
  - Cash Flow
  - Income Statement
- Added round selector.
- Added reconciliation indicator.
- Added detailed operating expense breakdown.
- Added cash financing / overdraft flow.
- Added inventory and fixed/other asset presentation.

### Financial Ratio
- Added dedicated Financial Ratio page.
- Added Current Ratio, Quick Ratio, Inventory Turnover, Fixed Asset Turnover, Total Asset Turnover, Debt Ratio, Times Interest Earned, Net Profit Margin, Basic Profit Margin, ROA, ROE, ROCE.
- Added round selector.

### Engine / history
- New simulated rounds persist line-item financial objects.
- Legacy saved rounds fall back to transparent reconstructed detail.
- Browser saves migrate from v0.1–v0.9 to v1.0.

### Excel
- Added Balance Sheet, Cash Flow, Income Statement, and Financial Ratios worksheets.

### Evidence / parity
- Implemented the previously extracted TopBoss workflow and financial-page structure.
- Raw screen-recording MP4 could not be reopened in the current runtime, so this release does not claim a new frame-level video audit.

### Database
- No new Supabase schema migration required.

## v0.9.0
Robust Optimizer.

## v0.8.0
Strategy Lab + Excel Workbook Export.

## v0.7.0
Workbook R0–R5 + Round 6 Planning Lab.

## Model boundary
v1.0 improves interface/workflow fidelity, not proprietary-formula certainty.
