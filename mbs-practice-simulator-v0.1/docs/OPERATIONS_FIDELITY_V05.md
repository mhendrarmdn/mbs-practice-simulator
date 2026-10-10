# v0.5 Workbook Operations Fidelity

This version deliberately distinguishes **explicit workbook mechanics** from **training-model approximations**.

## Explicit mechanics implemented

### Procurement
Raw materials ordered this round are delivered at the end of the round / beginning of the next round. Current production is constrained by beginning raw-material inventory.

### Production
Production requests are constrained by raw materials and by a maximum overtime ceiling of 50% above normal capacity.

### Capacity
Normal capacity loses 2.5% per round through aging. Equipment investment adds capacity for the next round at $20 per unit of capacity.

### Maintenance
Maintenance affects the next period. The workbook identifies a conversion factor around 0.7 as an optimal reference.

## Approximation boundary

The workbook does not provide the exact proprietary function that maps maintenance dollars into conversion-factor changes. v0.5 therefore uses a transparent bounded training proxy around the 0.7 reference.

The same distinction continues to apply to demand response, NPV, Balanced Score, and other undisclosed equations.
