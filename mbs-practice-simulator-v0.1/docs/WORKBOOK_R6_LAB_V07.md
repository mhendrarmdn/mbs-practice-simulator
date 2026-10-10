# v0.7 Workbook Round 6 Planning Lab

## Why this mode exists

The Student Workbook's exercise is structured around analyzing performance through Round 5 and then preparing management decisions for Round 6.

The workbook repeatedly states that Round 6 will not be simulated.

v0.7 represents that literally rather than extending the engine to invent a sixth set of results.

## State model

Competition / Training / Sandbox continue to use their normal result horizon.

Workbook Mode sets the result horizon to five rounds:

- R0 baseline
- R1 result
- R2 result
- R3 result
- R4 result
- R5 result

After that, the eight decision fields remain editable as an R6 plan.

Finalizing the R6 plan stores the decision set in `state.workbookPlan` and does not call `simulateRound()`.

## Decision Matrix behavior

When an R6 plan exists (or is being drafted after R5), matrices append a highlighted `R6 PLAN` row.

Decision-side fields can be populated.

Result-side fields that require simulation are intentionally blank.

## Multiplayer

The R6 plan lives inside the same JSON game state used by the v0.3 shared-room protocol.

No database schema migration is required.

Captain controls plan finalization; team members can still collaborate on the shared draft before finalization.
