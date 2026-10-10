# MBS Practice Simulator v0.7

Independent web-based training simulator for Macro Business Simulation / TopBoss-style competition practice.

> This is a **training twin**, not an official TopBoss clone. The simulator separates workbook-explicit mechanics, observed calibration anchors, and transparent practice approximations.

## v0.7 focus — Workbook Training Mode + Round 6 Planning Lab

The Student Workbook uses historical/performance data from **Round 0 through Round 5** as the controlling evidence, then asks the learner to make **Round 6 management decisions without simulating Round 6 results**.

v0.7 now mirrors that structure.

### New Workbook Mode

Select:

`Workbook R0–R5 + R6 Plan`

The workflow becomes:

`R0 baseline → R1 → R2 → R3 → R4 → R5 results → R6 business plan only`

Round 6 is deliberately **not simulated**.

### Workbook Lab

A dedicated Workbook Lab shows:

- R0–R5 completion progress
- controlling observations from the accumulated history
- Round 6 planning rationale
- the eight Round 6 management decisions
- explicit **NO R6 RESULT** status

The simulator will not fabricate Round 6 revenue, sales, market share, earnings, cash, equity, or NPV.

### R6 Business Plan

After completing Round 5, Business Decisions becomes the Round 6 planning screen.

The team can set:

- Price
- Marketing
- R&D
- Production Request
- Raw Material Procurement
- Maintenance
- Equipment Investment
- Dividend

The Captain then uses **Finalize R6 Business Plan** instead of Submit Round.

The finalized plan can be reopened and edited without ever generating Round 6 results.

### Decision Matrices

In Workbook Mode, the existing Business Intelligence Decision Matrices now add a highlighted:

`R6 PLAN`

row.

Decision values are shown, while outcome/result cells remain blank where a Round 6 result would otherwise be invented.

### Export

Workbook Lab can export a Markdown Round 6 business plan containing:

- R0–R5 review
- the eight R6 decisions
- planning rationale
- explicit planning-only disclaimer

## Competition Mode remains separate

Competition Mode continues to use the competition horizon already configured for the MBS E-Case simulator.

Workbook Mode does **not** globally change Competition Mode into a six-round competition.

## Existing features retained

- Floot-style cockpit UI
- v0.3 Captain / Member rooms
- v0.4 Decision Intelligence and R1 Calibration Lab
- v0.5 workbook-aligned operations mechanics and Decision Matrices
- v0.6 Competition Command Center and scenario stress tests
- adaptive AI
- Training / Competition / Sandbox
- save import/export and migration

## Supabase

**No new Supabase SQL migration is required for v0.7.**

The existing v0.3 room schema stores simulator state as JSON and remains sufficient.

## Model boundary

Round 6 planning is intentionally non-simulated in Workbook Mode. This prevents the practice twin from presenting invented Round 6 outcomes as if they were workbook-supported results.
