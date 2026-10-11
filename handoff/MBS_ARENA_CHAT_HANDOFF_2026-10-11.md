# MBS Arena / TopBoss Practice Simulator — Chat Handoff

**Project:** Mahen_MBS-E UI  
**Generated:** 2026-10-11  
**Purpose:** Continuation capsule for a new ChatGPT chat.

## 1. Product definition

MBS Arena is an **independent training twin + competition decision cockpit** for an MBS E-Case / TopBoss-like competition.

TopBoss remains the **official execution engine and source of truth**.

Target competition workflow:

```text
Official TopBoss environment/result
→ Official Sync in MBS Arena
→ build candidate decisions
→ simulate / stress test / optimizer / calibration
→ team check & recheck
→ Captain locks final decision
→ input manually into official TopBoss
→ TopBoss processes round
→ official result back into MBS Arena
→ predicted vs actual
→ adaptive recalibration
→ next round
```

Never present the practice formulas as proprietary TopBoss formulas.

## 2. Main source material already used

Uploaded references:
- `COMPETITION BOOKLET - MBS E-CASE COMPETITION 2026 (3).pdf`
- `Student Workbook (final).pdf`

Observed/recovered anchors:

### R0
- Revenue: **$2,808,826**
- Sales: **438,879**
- Price: **$6.40**
- Market Share: **6.25%**
- Net Profit: **$306,310**
- Unit Cost: **$5.42**

### R1 reference decision
- Price 6.40
- Marketing 190,000
- R&D 300,000
- Production 240,968
- Material Purchase 1,550,000
- Equipment 300,000
- Maintenance 280,000
- Dividend 0

### R1 observed result anchors
- Potential Demand 552,620
- Sales 291,968
- Finished Goods 0
- Production 240,968
- Next Capacity 418,924
- Raw Material 2,405,416
- Quality 0.34
- Image 0.62
- Market Share about 6.93%
- Revenue $1,868,595
- Net Earnings about -$456,502
- Unit Cost $7.96
- Ending Cash $0
- Overdraft $776,366
- Equity $10,254,050

Workbook rule:
- R0–R5 = result rounds
- R6 = **plan only**, no simulated result

Competition mode remains 4 rounds.

## 3. Current repo / production

Repository:

```text
https://github.com/mhendrarmdn/mbs-practice-simulator
```

Production:

```text
https://mbs-practice-simulator.vercel.app
```

Current stable version:

```text
v1.8.0
```

Current main merge commit:

```text
cd7c32ce985cbb09a63f0a9fb998df221405633e
```

Latest Vercel status: **SUCCESS**

Latest v1.8 PR:

```text
#32 — v1.8.0 adaptive calibration lab
```

v1.8 head commit:

```text
982dc1aa0d393748909c1e9cd919cdcf8313c7c2
```

## 4. Important version history

### v1.4.4 — Room Creation Access Control
PR #26  
Merge: `69e7238759262e0c9d683618335ff412af081fd8`

- Create Room moved behind Vercel server function
- requires owner-issued Creator Access Code
- public Supabase publishable key is not enough to create rooms
- server-only Supabase secret is used

Vercel variables:

```text
PUBLIC:
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY

SERVER SECRET:
ROOM_CREATOR_ACCESS_KEY
SUPABASE_SECRET_KEY
```

Never use `VITE_` prefix for server secrets.

### v1.4.5 — Captain Member Kick
PR #27  
Merge: `5f88bf643b9130c2786f6c0c1851b4a895ce3155`

Captain can kick non-captain member sessions.

Limitation:
Kick revokes the current session only. If the user still knows Room Code + Room Key, they can rejoin.

### v1.4.6 — Kick Button Render Hotfix
PR #28  
Merge: `7e1425c3450262073ce878d21667fcd5b876871d`

Fixed missing Kick button UI.

### v1.5.0 — Competitive Analysis + Captain Recovery
PR #29  
Merge: `6dd9555ed8e2f79ffd6a613214b09915f37bad59`

Competitive Analysis:
- early rounds use horizontal ranking instead of spaghetti chart
- trend lines only after enough history
- MARKOWITZ highlighted
- rank + delta
- autoscaling
- equal-share R0 note
- dynamic company count

Captain Recovery:
- per-room Captain Recovery Code
- Captain can re-enter an existing room after Leave Room
- credentials:
  - Room Code
  - Room Key
  - Captain Recovery Code
  - Display Name

Creator Access Code and Captain Recovery Code are different credentials.

### v1.6.0 — Official Sync & Reconciliation
PR #30  
Merge: `1c688b39bbd73bf0c5efd0b4ce7d53d312c05993`

Added **Status → Official Sync**.

Official per-round environment can override practice/random scenario:
- Price Index
- Economic Growth Factor
- Seasonal Factor
- Market Growth Factor
- Raw Material Index
- Demand Factor
- Capacity Factor
- Event / note

Official actual result fields include:
- Revenue
- Net Profit
- Sales
- Market Share
- Price
- Unit Cost
- Cash
- Overdraft
- Equity
- Quality
- Image
- Potential Demand
- Production
- Capacity
- Raw Material
- Finished Goods

Prediction is preserved before official actual replaces the live state.

### v1.7.0 — Vision Intake + Official Financial Sync
PR #31  
Merge: `ad6993e13ee25507f3990ea43dfe1ef81ab28975`

Added:
- multi-screenshot OCR, up to 6 screenshots
- browser-side `tesseract.js`
- OCR review buffer
- page classification:
  - Economic Environment
  - Business / Operating Status
  - Financial Statement
  - Mixed
- OCR confidence
- detailed official Balance Sheet / Cash Flow / Income Statement
- OCR audit metadata
- Evidence Log
- source-aware Excel export

Critical rule:

```text
Screenshot → OCR → Draft → Human Review → Captain Confirm → Official State
```

OCR never auto-commits.

Source hierarchy:

```text
1. Official confirmed TopBoss data
2. Structured copy/export/JSON
3. Human-verified manual entry
4. OCR-assisted screenshot draft
5. Practice-model estimate
```

### v1.8.0 — Adaptive Calibration Lab
PR #32  
Merge: `cd7c32ce985cbb09a63f0a9fb998df221405633e`

Added **Practice Tools → Calibration Lab**.

Learns from preserved simulator prediction vs official TopBoss actual pairs.

Correction factors:
- total market-size scale
- competitive share response
- production realization
- unit cost
- quality shift
- image shift

Anti-overfitting:
- robust median error
- correction shrunk toward neutral
- hard safety bounds

Approximate shrinkage:
- 1 round ≈ 33%
- 2 rounds = 50%
- 3 rounds = 60%
- 4 rounds ≈ 67%

Calibration shows:
- sample count
- confidence
- uncertainty band
- mean absolute error
- live factors
- round error history

Adaptive calibration feeds:
- normal simulator
- Scenario Center
- Competition Center
- Robust Optimizer

No Supabase migration required for v1.6–v1.8.

## 5. Current simulation mechanics

Transparent practice mechanics currently include:
- procurement arrives end-of-round / next-round
- current production uses beginning raw material
- overtime ceiling = 50% over normal capacity
- capacity aging ≈ 2.5% / round
- equipment proxy = $20 per capacity unit
- equipment affects next round
- maintenance affects next-round conversion factor
- reference maintenance ≈ 280,000
- demand attractiveness uses price, quality, image, marketing, R&D
- financial engine includes BS, CF, IS, ratios
- Practice NPV is explicitly a proxy

## 6. R0 competition baseline assumption

Current field:

```text
16 companies
6.25% each at Round 0
```

This is an inferred parity assumption from observed 6.25% R0 share.

Do not state it as confirmed proprietary TopBoss logic.

## 7. Multiplayer / security model

Supabase room state is revision-safe JSON.

Captain:
- canonical state commit authority
- can kick member sessions
- can resume an existing room via Recovery Code

Members:
- can participate in shared draft flow
- cannot create arbitrary rooms through public Supabase key
- cannot become Captain without recovery credentials

Room creation:

```text
Creator Access Code
→ /api/create-room
→ Vercel server
→ server validates secret
→ server-only Supabase secret
→ create room
```

Historical migrations:

```text
supabase/restrict_room_creation_v144.sql
supabase/add_member_removal_v145.sql
supabase/add_captain_recovery_v150.sql
```

The user showed successful v1.5 Captain Recovery migration execution.

## 8. Important UI issues already iterated/fixed

The project has already gone through many screenshot-driven fixes:
- header clipping / hamburger alignment
- sidebar layout and footer overlap
- sidebar scroll reset
- negative currency formatting
- chart axis scale
- one-point chart placeholders
- Sales Trend label collisions
- Net Profit zero line
- Product Image autoscaling
- Product Image point IDs / hover
- Market Share R0 equal baseline
- 16-company consistency
- Competitive Analysis spaghetti chart
- rank + delta tables
- Kick button renderer bug
- Captain resume flow

Do not regress these without reason.

## 9. Current product philosophy

The app should behave like a competition analyst, not an oracle.

Good output style:

```text
Candidate A:
highest expected profit
but high supply risk

Candidate B:
lower profit
strongest liquidity

Candidate C:
best robust NPV across scenarios

Recommendation:
Candidate C

Confidence:
78%

Main risk:
demand response uncertainty
```

Avoid claiming:
- exact TopBoss formula
- guaranteed winning decision
- false precision

## 10. Current modules

- Management Dashboard
- Business Decisions
- Decision History
- Economic Environment
- Official Sync
- Business Status
- Product Image
- Market Share
- Revenue / Sales Status
- Sales Trend
- Production & Logistics
- Cost Structure
- Competitive Analysis
- Financial Ratio
- Financial Statement
- Decision / Performance Tree
- Leaderboard
- Decision Matrices
- Competition Center
- Workbook Lab
- Strategy Lab
- Calibration Lab
- Robust Optimizer
- Scenario Center
- Model Transparency
- Room & Setup

## 11. Recommended next version

# v1.9 — Decision War Room / Candidate Comparison

This should become the main live-competition decision page.

Suggested scope:

### Multiple named candidates

```text
Candidate A — Margin Recovery
Candidate B — Share Capture
Candidate C — Balanced
Candidate D — Defensive
Candidate E — Custom
```

All candidates must use the SAME:
- official starting state
- official economic environment
- calibration profile

### Compare metrics side by side

Recommended:
- Expected Revenue
- Expected Net Profit
- Expected Market Share
- Expected Sales
- Expected Cash
- Expected Overdraft
- Expected Unit Cost
- Practice NPV
- Lost Sales
- Production
- Capacity
- Ending Raw Material
- Ending Finished Goods
- Quality
- Image
- Liquidity Risk
- Supply Risk
- Confidence
- Worst-case scenario outcome

### Scenario-aware comparison

For every candidate:
- Base
- Demand Boom
- Slowdown
- Raw Material Shock
- Capacity Disruption

Show:
- expected
- worst case
- robust score

### Multiplayer decision flow
Potential:
- member vote
- member comment / rationale
- Captain shortlist
- Captain select final candidate
- final lock

### Final TopBoss Input Card

After final lock:

```text
FINAL OFFICIAL INPUT

Price
Marketing
R&D
Production
Material Purchase
Equipment
Maintenance
Dividend
```

This final card should be visually simple, large, and designed for double-checking while another team member types the values into TopBoss.

## 12. Suggested v2.0 after War Room

Competition Submission Control:
- mandatory pre-submit checklist
- two-person verification
- large-number check mode
- locked final decision audit
- submission timestamp
- Captain-only unlock with reason
- evidence screenshot
- post-round debrief linked to submitted candidate

## 13. User preferences for this project

When the user says **“update ke versi selanjutnya”**, do not only provide code suggestions.

Expected workflow:
1. decide logical next version
2. edit GitHub directly
3. create branch / PR
4. verify build
5. merge if appropriate
6. verify Vercel production
7. report whether any Supabase/manual setup is required

Style:
- Indonesian
- direct
- practical
- minimal unnecessary preamble
- simple explanations but technically complete

## 14. Key project positioning sentence

> **MBS Arena is an independent training twin and competition decision cockpit that uses TopBoss as the official source of truth, lets the team simulate and stress-test decisions before submission, then reconciles official results afterward to improve the next-round forecast.**

## 15. Recommended opening message in the new chat

Use this:

> **Lanjutkan project MBS Arena dari handoff ini. Jangan reset arsitektur dan jangan mengulang versi lama. Repo utama adalah `mhendrarmdn/mbs-practice-simulator`, production di Vercel, latest stable version v1.8.0. Prioritas berikutnya adalah v1.9 Decision War Room / Candidate Comparison kecuali saya memberi arahan baru. Kalau saya bilang “update”, lakukan perubahan langsung di GitHub, buat PR, cek build, merge, dan pastikan Vercel sukses.**

## 16. Final handoff status

```text
PROJECT:
MBS Arena / TopBoss Practice Simulator

STATUS:
ACTIVE DEVELOPMENT

LATEST STABLE:
v1.8.0

MAIN COMMIT:
cd7c32ce985cbb09a63f0a9fb998df221405633e

VERCEL:
SUCCESS

LATEST MAJOR CAPABILITY:
Adaptive Calibration Lab

OFFICIAL SOURCE OF TRUTH:
TopBoss

RECOMMENDED NEXT VERSION:
v1.9 Decision War Room / Candidate Comparison

DATABASE MIGRATION NEEDED FOR v1.8:
NO
```
