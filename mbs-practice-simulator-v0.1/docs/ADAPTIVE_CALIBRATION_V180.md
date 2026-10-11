# v1.8.0 — Adaptive Calibration Lab

## Competition objective

MBS Arena should get more useful during the competition instead of repeating the same practice-model error every round.

v1.8 uses prior official TopBoss results to calibrate later practice forecasts while preserving three rules:

1. TopBoss remains the official source of truth.
2. Calibration is transparent and bounded.
3. Small samples must not be allowed to overfit the model.

## Learning loop

Prediction R1
→ TopBoss actual R1
→ Prediction error
→ bounded correction
→ Prediction R2
→ TopBoss actual R2
→ update correction

The same cycle continues for later rounds.

## Corrections learned

The adaptive layer currently learns:

- Market-size factor
- Competitive-share response factor for the user company
- Production-realization factor
- Unit-cost factor
- Quality shift
- Image shift

These are not claimed to be TopBoss equations.

## Shrinkage

One observed round is weak evidence. Therefore the raw observed error is deliberately reduced:

- n=1 → 33% weight
- n=2 → 50%
- n=3 → 60%
- n=4 → 67%

As more official rounds arrive, the correction can influence the simulator more strongly.

## Integration

When Calibration Lab is enabled:

- normal simulation uses adaptive corrections
- scenario stress testing uses adaptive corrections
- Robust Optimizer uses adaptive corrections
- each new round snapshot records the calibration profile used

The Captain can pause calibration to compare the calibrated engine against the transparent base engine.

## Safety

Calibration should improve ranking and direction, not create false certainty. The UI therefore exposes:

- official sample count
- model confidence
- uncertainty band
- mean absolute error
- per-round forecast error

No Supabase migration is required.
