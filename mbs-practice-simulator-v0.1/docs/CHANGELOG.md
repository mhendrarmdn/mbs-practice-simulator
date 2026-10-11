# Changelog

## v1.4.1 — Competition / Optimizer Stability Hotfix

### Fixed
- Prevents Competition Center and Robust Optimizer from taking down the whole app when one scenario evaluation fails.
- Adds per-scenario error isolation and graceful partial results.
- Adds safe page-render recovery in the application shell.
- Memoizes repeated stress-test / optimizer calculations so rerenders do not recompute identical analysis.
- Reduces the first-pass optimizer set from 18 to 12 candidates when the 16-company field is active, preserving the core strategic alternatives while cutting synchronous browser work.
- Detaches analysis clones from room, timer, lock, and realtime state before simulation.

### Competition Center
- Stress scenarios run independently.
- If one scenario fails, valid scenario rows remain visible.
- If every scenario fails, the page shows a readable reason instead of breaking navigation.

### Robust Optimizer
- Invalid scenario outcomes are skipped rather than propagating NaN / empty-array math failures.
- Strategy Alignment has a safe fallback score if its own analysis fails.
- If no valid outcomes remain, the optimizer returns a readable Not Available state.

### Runtime safety
- Future view-render errors are caught at the page boundary and shown in a Recovery Mode card so the sidebar remains usable.

### Database
- No Supabase migration required.

## v1.4.0 — Logic Calibration Phase 1

Transparent in-sample R0→R1 calibration with measurable fidelity reporting.

## v1.3.1 — Supabase Room pgcrypto Hotfix

Supabase pgcrypto search-path fix for online room RPCs.
