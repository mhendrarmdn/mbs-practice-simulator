# Changelog

## v1.4.2 — Calibration Runtime Consistency Hotfix

### Critical runtime fix
- Fixes `QUALITY_RD_RESPONSE is not defined` when submitting a round.
- Restores the full v1.4 calibration constant set in `config.js`.
- Ensures `simulator.js` imports and actually uses the fitted calibration coefficients.
- Restores the controlled Workbook R1 calibration environment and demand factor.
- Restores the expanded 15-metric Calibration Lab target set and fidelity diagnostics.

### Version / cache consistency
- UI badge, package metadata, document title, and state version now agree on v1.4.2.
- Adds cache-busting query strings to the main JS/CSS assets so browsers do not mix an old shell with newer modules after deployment.

### R0 chart behavior clarified
- R0 Revenue / Sales Status intentionally shows a Revenue / Profit snapshot rather than a line chart because there is only one period.
- R0 Sales Trend intentionally shows an operating bar snapshot.
- Both pages now explain that line trends appear after Round 1 creates the second data point.

### Competition / Optimizer
- Keeps the v1.4.1 scenario-isolation and safe-render protections.

### Supabase room note
- The pgcrypto room error is separate from the chart / calibration bug.
- If online rooms still show the pgcrypto migration prompt, run `supabase/fix_pgcrypto_search_path_v131.sql` once in Supabase SQL Editor.

### Database
- No new Supabase migration for v1.4.2.

## v1.4.1 — Competition / Optimizer Stability Hotfix

Scenario isolation, memoization, lighter optimizer workload, and safe render recovery.

## v1.4.0 — Logic Calibration Phase 1

Transparent in-sample R0→R1 calibration with measurable fidelity reporting.
