# MBS Practice Simulator v0.4

Independent web-based training simulator for Macro Business Simulation / TopBoss-style competition practice.

> This is a **training twin**, not an official TopBoss clone. Observed values are calibration anchors; simulator formulas remain transparent practice approximations.

## v0.4 focus — Decision Intelligence

v0.4 keeps the Floot-style cockpit, v0.3 team room, and all prior simulation features, then adds an analyst layer for better decision discipline:

- **Pre-Submit Decision Readiness** score
- risk checks for price vs unit cost, supply coverage, raw material coverage, CAPEX, dividend, and liquidity
- **Round Debrief** after every submitted round
- causal interpretation of share, sales, margin, bottleneck, overdraft, and product quality/image movements
- **Scenario Presets** for controlled stress testing in Training/Sandbox
- Controlled Baseline
- Demand Boom
- Economic Slowdown
- Raw Material Shock
- Equipment Disruption
- **R1 Calibration Lab** against observed Round 1 anchors
- calibration score only when the actual R1 Reference decision set was used
- automatic migration from v0.1/v0.2/v0.3 saves

Competition Mode always forces the macro scenario back to **Auto**, so manual stress-test presets cannot be used as a hidden advantage inside competition practice.

## Existing features retained

- Round 0 + Round 1–4
- 8 management decisions
- 9 adaptive AI competitors
- Dark / Light / System
- Training / Competition / Sandbox
- shared Competition timer
- Sensitivity Lab
- Scenario Center
- financial alerts
- Decision History
- Practice NPV + Balanced Score proxies
- save export/import
- Model Transparency
- v0.3 Captain / Member shared room, presence, atomic draft sync, revision protection
- responsive Floot-style cockpit

## Deploy

The Vercel app remains inside:

`mbs-practice-simulator-v0.1/`

The folder name is intentionally preserved so the current Vercel Root Directory does not need to change.

## Supabase

v0.4 does **not** require another database migration beyond the v0.3 schema. If your v0.3 team-room schema is already installed successfully, no new SQL step is required for this version.

## Calibration Lab

For a meaningful R1 fidelity score:

1. Start from Round 0.
2. Open Business Decisions.
3. Click **Load R1 Reference**.
4. Submit Round 1.
5. Open **Model Transparency**.
6. Compare observed vs simulated R1 outputs.

The score is a transparent diagnostic convenience, not proof that proprietary TopBoss formulas have been reverse engineered.

## Model boundary

The project does not claim access to proprietary TopBoss demand, NPV, balanced-score, or internal calculation formulas.
