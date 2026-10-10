# Changelog

## v0.5.0 — Operations Fidelity

### Workbook-aligned mechanics
- Procurement now arrives at end-of-round / beginning of next round.
- Same-round procurement no longer rescues current production shortages.
- Production overtime ceiling is now 50% above normal capacity.
- Normal capacity ages 2.5% per round.
- Equipment investment adds next-round capacity at $20 per capacity unit.
- Maintenance changes next-round conversion efficiency.
- Added conversion-factor KPI with ~0.7 workbook reference.
- Added operations timing fields to round history.

### Decision matrices
- Added Overall Business Matrix.
- Added Price Matrix.
- Added Marketing & R&D Matrix.
- Added Procurement Matrix.
- Added Production Matrix.
- Added Maintenance & Equipment Matrix.
- Added Dividend Matrix.

### UI / analysis
- Status now separates beginning capacity, overtime ceiling, beginning RM, end RM, procurement delivery, and conversion factor.
- Analysis now shows operational constraints using beginning-of-round resources.
- Decision Readiness now respects one-round procurement delivery timing.

### Compatibility
- Migrates v0.1-v0.4 local saves to v0.5.
- No new Supabase migration.
- Existing Vercel Root Directory unchanged.

## v0.4.0
Decision Intelligence: readiness score, debrief, scenario presets, R1 calibration.

## v0.3.0
Shared team room: roles, presence, revision-safe sync, shared timer.

## v0.2.0
Floot-style cockpit, themes, modes, Sensitivity Lab, adaptive AI, scenarios, save recovery.

## Model boundary
This remains an independent training simulator. Workbook-explicit mechanics are implemented directly; undisclosed proprietary equations remain approximations.
