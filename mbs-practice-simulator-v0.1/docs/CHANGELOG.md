# Changelog

## v0.7.0 — Workbook Training + Round 6 Planning Lab

### Workbook Mode
- Added a fourth mode: Workbook R0–R5 + R6 Plan.
- Workbook Mode uses five simulated result rounds after the R0 baseline.
- Round 6 becomes planning-only.
- Round 6 cannot generate simulated market, operational, financial, or NPV results.

### Workbook Lab
- Added R0–R5 progress timeline.
- Added historical controlling review.
- Added Round 6 planning rationale.
- Added Round 6 eight-decision summary.
- Added explicit NO R6 RESULT indicator.
- Added reopen/finalize workflow.

### Business Decisions
- After R5 in Workbook Mode, Business Decisions automatically changes into Round 6 Business Plan.
- Submit Round is replaced by Finalize R6 Business Plan.
- Finalization records the plan without calling the simulation engine.

### Decision Matrices
- Added R6 PLAN row in Workbook Mode.
- Decision values are shown.
- Unsupported R6 result cells display blank / em dash instead of fabricated outcomes.

### Export
- Added Round 6 Workbook Plan Markdown export.

### Compatibility
- Migrates v0.1–v0.6 browser saves to v0.7.
- Competition Mode remains on its own competition horizon.
- No new Supabase migration required.
- Existing Vercel Root Directory unchanged.

## v0.6.0
Competition Command Center, stress tests, strategy brief, presentation and Q&A preparation.

## v0.5.0
Workbook-aligned operations fidelity and Business Intelligence Decision Matrices.

## v0.4.0
Decision Readiness, Round Debrief, Scenario Presets, R1 Calibration Lab.

## v0.3.0
Captain/Member shared rooms, presence, revision-safe sync, shared competition timer.

## Model boundary
This remains an independent training simulator. Workbook Mode explicitly refuses to fabricate Round 6 outcomes.
