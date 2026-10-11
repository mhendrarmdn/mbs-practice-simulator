# Changelog

## v1.6.0 — Official Sync & Reconciliation

### Competition source of truth
- Adds **Official Sync** to the Status workflow.
- Official TopBoss environment values can be entered per round and override the simulator's random/scenario environment for that round.
- Supported environment controls:
  - Price Index
  - Economic Growth Factor
  - Seasonal Factor
  - Market Growth Factor
  - Raw Material Index
  - Demand Factor
  - Capacity Factor
  - Event / note

### Official round outcome
- Captain can store official TopBoss outcome values after a round is processed.
- Supported headline actuals include revenue, net profit, sales, market share, price, unit cost, cash, overdraft, equity, quality, image, demand, production, capacity, raw material, and finished goods.
- Before overwriting the live user-company state, the simulator preserves its original predicted snapshot.
- Official actuals can then be adopted as the live starting state for the next decision round.

### Predicted vs Actual
- Adds a round reconciliation table comparing simulator prediction against official TopBoss actual.
- Shows percentage error or percentage-point error for Market Share.
- Workbook Excel export now includes:
  - Official Environment
  - Official Actuals
  - Reconciliation

### Fast intake
- Adds parser support for pasted TopBoss text, copied tables, or JSON.
- Parsed values populate the form but are **not committed automatically**.
- Adds screenshot evidence upload/preview for check-and-recheck.
- Screenshot evidence metadata can be stored without putting large image bytes into the shared room state.

### OCR / Vision boundary
- v1.6.0 deliberately does **not** silently OCR a screenshot into live game state.
- Screenshot OCR should be treated as an assisted draft with confidence/review, because a single wrong digit can materially change competition decisions.
- Structured copy/paste or export is preferred whenever TopBoss allows it.

### Financial statement boundary
- Official headline actuals can replace live top-level state.
- Detailed Balance Sheet / Cash Flow / Income Statement line items remain the practice-model statement until a dedicated detailed-statement import is added.
- The Financial Statement page displays this boundary when official headline actuals exist.

### Multiplayer
- Official Sync changes are Captain-controlled and are committed through the existing revision-safe shared room state.
- No new Supabase database migration is required for v1.6.0.

## v1.5.0 — Competitive Analysis + Captain Recovery

Competitive decision-support redesign and secure per-room Captain recovery.

## v1.4.6 — Kick Button Render Hotfix

Restored Captain-only Kick controls in Room & Setup.

## v1.4.5 — Captain Member Kick

Captain-authorized member-session removal.

## v1.4.4 — Room Creation Access Control

Server-side owner-gated room creation.
