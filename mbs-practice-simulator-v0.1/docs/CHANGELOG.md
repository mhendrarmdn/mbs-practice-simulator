# Changelog

## v0.8.0 — Strategy Lab + Excel Export

### Strategy Lab
- Added six strategic objectives.
- Added selected objective to game state.
- Added Strategy Alignment score.
- Added signal map for profitability, liquidity, market, capacity, premium, and readiness.
- Added objective-specific priorities.
- Added objective-specific risk guardrails.
- Added cross-objective comparison table.
- Captain controls the shared strategy goal in online rooms.

### Excel Workbook Export
- Added browser-side `.xlsx` export using SheetJS.
- Added Summary worksheet.
- Added Round History worksheet.
- Added Strategy Alignment worksheet.
- Added seven workbook-style Decision Matrix worksheets.
- Added Round 6 Plan worksheet.
- R6 outcome cells remain intentionally absent because Workbook Round 6 is planning-only.

### Compatibility
- Migrates v0.1–v0.7 browser saves to v0.8.
- No new Supabase migration.
- Existing Vercel Root Directory unchanged.

## v0.7.0
Workbook R0–R5 + Round 6 Planning Lab.

## v0.6.0
Competition Command Center, stress tests, presentation and Q&A preparation.

## v0.5.0
Workbook-aligned operational mechanics and Decision Matrices.

## v0.4.0
Decision Readiness, Round Debrief, Scenario Presets, R1 Calibration Lab.

## v0.3.0
Captain/Member shared rooms, presence, revision-safe sync, shared timer.

## Model boundary
This remains an independent training simulator. Strategy Alignment and workbook exports present the training model transparently.
