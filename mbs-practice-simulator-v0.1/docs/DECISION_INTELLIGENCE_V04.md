# v0.4 Decision Intelligence

The purpose of v0.4 is not to make the simulator pretend it knows the official winning answer. It adds disciplined interpretation around an intentionally transparent training model.

## 1. Decision Readiness

The readiness score is a rule-based pre-submit diagnostic. It assesses whether the current draft presents obvious operational or financial contradictions.

It is not an optimization algorithm and does not guarantee a higher NPV.

## 2. Round Debrief

The debrief reads actual simulated outcomes after each submitted round and translates them into causal management observations, for example:

- share up while profit down
- unmet demand because sales are constrained by available finished goods / production
- unit cost above selling price
- overdraft and liquidity pressure
- quality/image improvement without sufficient supply

## 3. Scenario Presets

Presets allow repeatable stress tests in Training and Sandbox. They deliberately do not operate in Competition mode.

This makes it possible to ask questions such as:

- Can the plan survive a raw-material shock?
- Does capacity become the bottleneck in a demand boom?
- How much inventory risk emerges in a slowdown?

## 4. Calibration Lab

Calibration is only comparable when Round 1 uses the observed R1 decision reference.

The lab compares known observed R1 result anchors with simulator outputs and reports a simple fidelity score:

`100 - mean(capped absolute percentage error)`

For observed values equal to zero, a non-zero simulated result is shown as non-comparable for percentage error.

This diagnostic is intentionally transparent and should improve as more real decision → result observations are collected.
