# Changelog

## v1.3.0 — Equal-Share Competition Baseline

### Round 0 parity
- Expands the practice field from 10 companies to 16 companies.
- Round 0 now starts with exactly 6.25% market share for every company.
- Baseline sales/potential demand are aligned to 438,879 units per company.
- 16 × 438,879 = 7,022,064, matching the simulator's existing base market size.
- MARKOWITZ retains the observed Round 0 anchors: 6.25% share, 438,879 sales, $2,808,826 revenue, $6.40 price, and the existing practice financial baseline.

### Competitor field
- Adds six additional synthetic strategy archetypes so the practice market contains 15 AI competitors plus the user company.
- Competitor names/strategies remain training constructs; they are not presented as official competition teams.
- Competitor product/financial characteristics can still differ at R0, but market share and baseline sales begin equal.

### Market-share trust
- Equal-share ties are now shown as tied positions (for example T1/16) instead of falsely implying a unique #1 rank.
- R0 Market Share and Dashboard include an Equal-start baseline notice.
- From R1 onward, market shares diverge through the practice demand/attractiveness engine.

### Save migration
- Old saves that are still at R0 automatically rebuild onto the new 16-company baseline.
- Active pre-v1.3 saves at R1+ are preserved to avoid corrupting an in-progress simulation.
- Preserved legacy active runs show a notice explaining that reset/start-new-session is required to adopt the new baseline.

### Evidence / scope note
- The 16-company equal-share baseline is a strong parity inference from the observed 6.25% Round 0 share together with the 7,022,064 base market size.
- It is not claimed as a verbatim rule from the competition booklet.
- No proprietary TopBoss formula is claimed or reproduced.

### Database
- No Supabase schema migration required.

## v1.2.6 — Chart Readability & Financial Insight

Chart spacing, compact axes, table alignment, ranking semantics, and automatic financial debrief.

## v1.2.5 — Chart Trust & Automatic Debrief

Negative-money formatting, rounded chart axes, break-even semantics, Sales Trend debrief, enriched Product Image, revenue rank, and sidebar completion.
