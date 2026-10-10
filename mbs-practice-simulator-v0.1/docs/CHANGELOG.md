# Changelog

## v1.4.0 — Logic Calibration Phase 1

### Calibration scope
- Calibrates the transparent practice engine against the observed R0 → R1 decision/result pair.
- Does not hardcode the R1 result object into the simulator.
- Does not claim recovery of proprietary TopBoss formulas.
- Workbook R1 acts as the controlled calibration replay environment; Competition mode remains stochastic.

### Fitted transparent coefficients
- R&D → Quality response: 0.093.
- Marketing → Image response: 0.043.
- Competitive attractiveness direct marketing weight: 0.25.
- Competitive attractiveness direct R&D weight: 0.50.
- Direct unit-cost base: 3.325792.
- Workbook R1 demand factor: 1.13528475.
- Existing quality/image/price attractiveness structure is retained and made explicit in Model Transparency.

### Operational / financial fit
- Adds observed R1 Production, Quality, and Image to the calibration target set.
- R1 reference production remains constrained by actual starting capacity and raw material, not an output override.
- Revenue continues to derive from Sales × Price.
- Raw material continues to reconcile through beginning RM − consumption + delivered procurement.
- Profit, cash, overdraft, and equity continue to flow through the financial engine.

### Calibration Lab
- Expands the fidelity table to 15 observed metrics.
- Reports mean absolute percentage error, maximum metric error, fidelity band, and calibration score.
- Displays fitted practice-model coefficients.
- A valid Phase-1 comparison requires both the R1 reference decision and the controlled Workbook R1 calibration environment.
- Explicitly labels the current fit as in-sample; R2–R5 observations are still required for out-of-sample validation.

### Save safety
- Fresh/reset sessions use `phase1-r1-v14`.
- Existing active pre-v1.4 runs are preserved as `legacy-active-pre-v14` instead of silently rewriting historical results.
- Reset the game to evaluate Phase-1 calibration from a clean R0 baseline.

### Database
- No Supabase schema migration required.
- The separate v1.3.1 pgcrypto SQL hotfix is still required only if online room RPCs have not yet been patched.

## v1.3.1 — Supabase Room pgcrypto Hotfix

Supabase pgcrypto search-path fix for online room RPCs.

## v1.3.0 — Equal-Share Competition Baseline

16-company equal-share Round 0 baseline with 6.25% market share each.
