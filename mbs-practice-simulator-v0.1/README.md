# MBS Practice Simulator v0.8

Independent web-based training simulator for Macro Business Simulation / TopBoss-style competition practice.

> This is a **training twin**, not an official TopBoss clone. Observed values and workbook-explicit mechanics are separated from transparent training approximations.

## v0.8 focus — Strategy Lab + Excel Workbook Export

### Strategy Lab

v0.8 adds objective-driven decision support. The same draft is evaluated differently depending on the selected management goal:

- Balanced Value
- Profitability First
- Market Leadership
- Liquidity Defense
- Capacity Growth
- Premium Brand

The Strategy Lab shows:

- objective alignment score
- signal map for profitability, liquidity, market, capacity, premium positioning, and decision readiness
- next-round priorities
- goal-specific guardrails
- comparison of the same draft across all six strategic objectives

This is intentionally a heuristic alignment tool, not an optimizer or guaranteed winning strategy.

### Excel Workbook Export

Workbook Lab can now export a real `.xlsx` workbook directly from the browser.

The generated Excel file contains:

- Summary
- Round History
- Strategy Alignment
- Overall Business Matrix
- Price Matrix
- Marketing & R&D Matrix
- Procurement Matrix
- Production Matrix
- Maintenance & Equipment Matrix
- Dividend Matrix
- Round 6 Plan

The Round 6 worksheet keeps the same v0.7 rule: **R6 is planning-only** and contains no fabricated R6 results.

### Workbook Mode retained

`R0 baseline → R1 → R2 → R3 → R4 → R5 results → R6 business plan only`

### Existing features retained

- Floot-style light/dark cockpit
- Training / Competition / Sandbox / Workbook modes
- v0.3 Captain / Member shared rooms
- v0.4 Decision Intelligence and Calibration Lab
- v0.5 workbook-aligned operational mechanics and Decision Matrices
- v0.6 Competition Command Center
- v0.7 Workbook Lab and non-simulated R6 planning
- adaptive AI
- scenario stress testing
- save import/export

## Supabase

No new Supabase schema migration is required for v0.8.

## Excel implementation

The web app uses SheetJS (`xlsx`) client-side. Export happens in the user's browser; no Excel file needs to be stored on the server.

## Model boundary

Strategy Alignment and Practice NPV remain transparent decision-support proxies. They do not claim to reproduce proprietary TopBoss scoring or valuation formulas.
