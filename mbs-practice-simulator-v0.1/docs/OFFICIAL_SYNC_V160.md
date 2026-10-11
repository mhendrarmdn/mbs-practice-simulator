# v1.6.0 — Official Sync & Reconciliation

## Purpose

MBS Arena is a decision-support cockpit. TopBoss remains the official execution engine.

The competition workflow is:

1. Read the official TopBoss economic environment.
2. Enter or paste it into **Official Sync**.
3. Build and simulate candidate decisions in MBS Arena.
4. Check the recommendation and risks.
5. Enter the final decision manually into TopBoss.
6. After TopBoss processes the round, enter the official result back into MBS Arena.
7. Compare predicted vs actual and use the official result as the starting state for the next round.

## Why official environment overrides matter

TopBoss may change the macro environment between competition runs or rounds. The simulator must not assume that the workbook/practice environment is still valid.

When an official environment is saved for Round N, `economyForRound(state, N)` uses that confirmed environment before any training preset, random environment, or workbook calibration environment.

## Why predictions and actuals are stored separately

A prediction is evidence about model quality. Replacing it without preserving it would destroy calibration information.

Before official actuals are adopted, v1.6 stores the predicted round snapshot in:

`state.official.predictions[round]`

Official values are stored in:

`state.official.actuals[round]`

This supports reconciliation without confusing model output and competition truth.

## Intake hierarchy

Use the safest available source:

1. **Structured export / copied table / JSON** — preferred.
2. **Manual verified entry** — reliable when fields are limited.
3. **Screenshot evidence** — useful for audit/check-and-recheck.
4. **OCR/Vision extraction** — future assisted workflow only, with confidence and human confirmation.

A screenshot should never silently change live simulation state during a competition.

## Shared-room behavior

Only the Captain should commit official environment and actual-result changes. Once committed, every room member receives the same official source-of-truth state through the existing room revision flow.

## Current financial-statement boundary

v1.6 imports headline actuals needed for the next decision round. It does not yet replace every detailed Balance Sheet / Cash Flow / Income Statement line item from a TopBoss screenshot.

That should be a dedicated future importer because line-item mapping must be exact and auditable.
