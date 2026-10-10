# MBS Practice Simulator v0.5

Independent web-based training simulator for Macro Business Simulation / TopBoss-style competition practice.

> This is a **training twin**, not an official TopBoss clone. v0.5 increases operational fidelity using mechanics explicitly stated in the Student Workbook while keeping proprietary equations labeled as training approximations.

## v0.5 focus — Operations Fidelity + Decision Matrices

### Workbook-aligned timing mechanics
- procurement ordered in the current round arrives at the **end of the round / beginning of the next round**
- current production therefore depends on **beginning raw-material inventory**, not same-round procurement
- production may use overtime up to **50% above normal capacity**
- normal production capacity ages by **2.5% per round**
- equipment investment adds future capacity at the workbook-stated **$20 per unit of capacity**
- maintenance affects **next-round** efficiency, not current-round production
- conversion factor is surfaced as an operations KPI with **~0.7** as the workbook reference
- exact maintenance→conversion response remains a transparent training proxy because the workbook does not disclose the proprietary response equation

### Business Intelligence Decision Matrices
A new **Decision Matrices** page mirrors the workbook's PDCA control structure:
- Overall Business Matrix
- Price Matrix
- Marketing & R&D Matrix
- Procurement Matrix
- Production Matrix
- Maintenance & Equipment Matrix
- Dividend Matrix

Each table links round decisions to the outcomes/KPIs the workbook says should be reviewed.

## Existing features retained
- Floot-style light/dark cockpit
- Training / Competition / Sandbox
- v0.3 Captain/Member room collaboration
- shared Competition timer
- adaptive AI competitors
- Sensitivity Lab
- v0.4 Decision Readiness
- Round Debrief
- Scenario Presets
- R1 Calibration Lab
- save import/export and migration
- Model Transparency

## Supabase

**No new Supabase SQL migration is required for v0.5.** The v0.3 schema remains sufficient.

## Model boundary

Where the workbook supplies an explicit mechanic (timing, 50% overtime ceiling, 2.5% aging, $20 capacity cost, ~0.7 conversion reference), v0.5 implements it directly.

Where the workbook does **not** disclose an exact equation, the simulator continues to use clearly labeled practice approximations.
