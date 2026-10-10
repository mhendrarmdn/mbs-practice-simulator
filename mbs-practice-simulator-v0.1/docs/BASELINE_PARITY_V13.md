# TopBoss Baseline Parity — v1.3.0

## Purpose
Align the practice simulator's Round 0 competitive field with the strongest baseline evidence available from the supplied recording-derived notes and existing simulator constants.

## Supported baseline facts
- MARKOWITZ Round 0 market share: approximately 6.25%.
- MARKOWITZ Round 0 sales: 438,879 units.
- Existing simulator base market size: 7,022,064 units.

The arithmetic identity is exact:

- 438,879 × 16 = 7,022,064
- 1 / 16 = 6.25%

This strongly supports using a 16-company equal-share Round 0 practice baseline.

## Implementation
- 1 user company + 15 synthetic AI competitors.
- Every company begins R0 with 6.25% market share.
- Every company begins R0 with 438,879 baseline sales/potential demand.
- Competitor price, product quality/image, operating position, and financial characteristics remain synthetic training variables unless independently observed.
- Shares diverge after R1 decisions through the transparent practice demand engine.

## Important limitation
This is a parity inference, not a claim that the competition booklet verbatim states “16 companies at 6.25% each.” The UI and Model Transparency language should preserve that distinction.

## Migration
Existing R0 saves are upgraded automatically. Existing active R1+ saves remain untouched and must be reset to adopt the v1.3 baseline.
