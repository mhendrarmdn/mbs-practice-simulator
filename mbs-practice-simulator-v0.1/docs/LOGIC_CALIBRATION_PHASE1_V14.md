# Logic Calibration Phase 1 — v1.4.0

## Objective

Fit the transparent practice simulator to the strongest observed decision → result pair currently available:

- R0 observed baseline
- R1 observed decision vector
- R1 observed outcome anchors

This is an in-sample calibration exercise. It is not a reconstruction of proprietary TopBoss source code or equations.

## R1 reference decision

- Price: 6.40
- Marketing: 190,000
- R&D: 300,000
- Production: 240,968
- Material purchase: 1,550,000
- Equipment: 300,000
- Maintenance: 280,000
- Dividend: 0

## R1 observed targets used

- Potential demand: 552,620
- Sales: 291,968
- Market share: 6.93%
- Finished goods: 0
- Production: 240,968
- Next capacity: 418,924
- Raw material inventory: 2,405,416
- Quality: 0.34
- Image: 0.62
- Unit cost: 7.96
- Revenue: 1,868,595
- Net earnings: -456,502
- Ending cash: 0
- Overdraft: 776,366
- Equity: 10,254,050

## Calibration method

The model does not copy the observed result into state. Instead, Phase 1 adjusts a small set of transparent coefficients and then runs the normal simulation flow.

Key fitted values:

- Quality R&D response = 0.093
- Image marketing response = 0.043
- Attractiveness marketing weight = 0.25
- Attractiveness R&D weight = 0.50
- Direct unit-cost base = 3.325792
- Workbook R1 demand factor = 1.13528475

The existing operational identities remain active:

- sales = min(potential demand, available finished goods)
- available FG = beginning FG + production
- ending RM = beginning RM − material consumed + delivered procurement
- revenue = sales × price
- cash / overdraft / equity flow from the financial engine

## Why Workbook R1 has a controlled environment

The observed R1 share and demand came from one specific competitive environment. We do not know the proprietary opponent model or every opponent decision. Therefore the Workbook R1 replay fixes a transparent external demand factor for calibration.

Competition mode remains stochastic and should not be expected to reproduce the same R1 outcome.

## Validation rule

A Calibration Lab score is comparable only when:

1. the submitted decision matches the R1 reference within tolerance; and
2. the result was generated in the Workbook R1 calibration environment.

A high score is an in-sample fit only. The next calibration stage requires observed R2–R5 decision/result pairs to test whether the fitted relationships generalize.

## Known residual

The model deliberately retains the documented 2.5% capacity-aging rule. The observed next-capacity anchor implies a slightly different effective decay, so a small capacity residual is expected rather than silently replacing the workbook mechanic.
