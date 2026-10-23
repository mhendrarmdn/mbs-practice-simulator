# Official Twin v2.0.0

## Purpose

v2.0 separates evidence-backed MBS mechanics from the simulator's transparent practice model. The product has two cooperating layers:

- **Official Twin:** recorded workflow, official-result capture, verified rule registry, financial/status/analysis parity views.
- **Strategy Lab:** scenarios, optimizer, calibration, team decision room, and practice projections.

## Evidence classes

- **Confirmed:** explicitly stated in supplied official materials or directly observed in captured official output.
- **Derived:** deterministic reconciliation from official statements, but not published as a TopBoss formula.
- **Calibrated:** fitted from official prediction-versus-actual pairs.
- **Assumption:** transparent scenario-only proxy.
- **Unknown:** proprietary/unpublished and must not be represented as exact.

## Confirmed examples

- Eight decision levers: price, production, procurement, marketing, R&D, maintenance, equipment, dividend.
- Procurement has a one-round delivery lag.
- Overtime production is capped at 50% of normal capacity.
- Capacity ages by 2.5% per round.
- Equipment expansion costs $20 per additional unit of capacity.
- Maintenance/equipment effects materialize next round.
- Conversion-factor target is around 0.7.
- Preliminary competition uses four rounds; final uses four fixed rounds plus up to two surprise rounds.

## Unknown / calibration targets

- Demand elasticity and exact customer choice model.
- Marketing/R&D response curves and ceilings.
- Competitor-driven market-share transfer.
- Aggregate procurement impact on raw-material price.
- Exact accounting cost functions where only output statements are visible.
- Official NPV and balanced-scorecard equations.

## Round operating procedure

1. Capture official result.
2. Reconcile against the prior forecast.
3. Diagnose the largest model error.
4. Calibrate bounded parameters only.
5. Stress-test candidate decisions.
6. Lock the eight decisions with cash/capacity/inventory guardrails.

## Deployment

Production remains Vite on Vercel with project root `mbs-practice-simulator-v0.1`. Merging to `main` is expected to trigger the existing Git integration.
