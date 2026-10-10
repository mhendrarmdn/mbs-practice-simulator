# v0.9 Robust Optimizer

## Purpose

The Robust Optimizer helps a team compare multiple reasonable draft decisions before submitting a round.

It is deliberately designed as a **bounded candidate search**, not a black-box "winning answer" generator.

## Candidate generation

The current draft is compared with interpretable variants such as:

- Margin Recovery
- Liquidity Shield
- Share Capture
- Supply Capture
- Premium Push
- Lean Operator
- balanced +/- adjustments
- isolated price / marketing / R&D / production / CAPEX / dividend variants

## Scenario evaluation

Every candidate is simulated against the same five controlled scenarios:

1. Controlled Baseline
2. Demand Boom
3. Economic Slowdown
4. Raw Material Shock
5. Equipment Disruption

## Scoring

Each candidate receives a Robust Score based on a transparent combination of:

- post-simulation Strategy Alignment
- normalized Practice NPV delta
- worst-case Practice NPV delta
- liquidity safety
- profit / market-share behavior
- scenario volatility

The weighting changes with the selected risk profile.

## Risk profiles

### Conservative
More weight on worst-case NPV, liquidity, and stability.

### Balanced
Balances alignment, expected Practice NPV, and downside resilience.

### Aggressive
More weight on upside Practice NPV and market capture.

## Apply Recommended Draft

Only the Captain can apply the recommended candidate in a shared room.

Applying a candidate updates the eight management-decision fields; it does not submit the round automatically.

## Workbook R6

The optimizer refuses to simulate Workbook Round 6 because v0.7 intentionally defines R6 as planning-only.

## Limitation

The optimizer does not search every possible numeric combination and does not know proprietary TopBoss formulas. "Recommended" means best-ranked among the transparent candidates evaluated by the practice model.
