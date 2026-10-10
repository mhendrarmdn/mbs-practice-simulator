# Changelog

## v0.4.0 — Decision Intelligence

### Pre-Submit Decision Readiness
- Added a 0–100 readiness score before round submission.
- Checks price vs current unit cost.
- Checks planned supply coverage vs current potential demand.
- Checks raw-material sufficiency / excess.
- Flags dividend under financial pressure.
- Flags CAPEX while overdraft is active.
- Flags aggressive discretionary cash commitments.

### Round Debrief
- Added post-round causal debrief.
- Explains market-share movement.
- Explains sales movement.
- Tracks profit change vs prior round.
- Detects unserved demand / supply bottleneck.
- Calls out unit-cost > price.
- Calls out overdraft pressure.
- Notes quality/image improvements.

### Scenario Presets
- Added Auto / Competition-like.
- Added Controlled Baseline.
- Added Demand Boom.
- Added Economic Slowdown.
- Added Raw Material Shock.
- Added Equipment Disruption.
- Manual presets work in Training / Sandbox.
- Competition Mode forces Auto.

### Calibration Lab
- Added observed R1 calibration object.
- Detects whether the R1 Reference decision set was actually used.
- Compares simulated R1 outputs with observed anchors.
- Reports per-metric absolute percentage error.
- Provides a transparent fidelity score when comparable.
- Explicitly retains the model-boundary disclaimer.

### Compatibility
- Migrates local save state from v0.1, v0.2, and v0.3.
- Keeps v0.3 team-room schema; no new Supabase migration required.
- Preserves existing Vercel Root Directory.

## v0.3.0

- Added per-member room sessions and display names.
- Added Captain / Member roles.
- Added online/away presence.
- Added atomic decision-field patches.
- Added room revision protection.
- Added Captain-only submit/control actions.
- Added shared Competition deadline.
- Fixed remote-state polling timestamp thrash.

## v0.2.0

- Added Light / Dark / System themes.
- Added Training / Competition / Sandbox.
- Added timer and locking.
- Added Sensitivity Lab.
- Added adaptive AI.
- Added Scenario Center.
- Added alerts, save import/export, Model Transparency.
- Reworked UI into Floot-style competition cockpit.

## Model boundary

This project remains an independent training simulator and does not claim to reproduce proprietary TopBoss formulas.
