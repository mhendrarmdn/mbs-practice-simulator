# MBS Practice Simulator v1.7.0

Independent web-based training simulator for Macro Business Simulation / TopBoss-style competition practice.

> This is a **training twin and competition decision cockpit**, not an official TopBoss clone. v1.7 keeps TopBoss as the official source of truth while adding verified Official Sync, OCR-assisted screenshot intake, predicted-vs-actual reconciliation, and detailed official financial-statement import.

## v1.0 focus — TopBoss Workflow Parity + Full Financial Statements

### Collapsible sidebar
- added a hamburger button in the top bar
- sidebar can be hidden and shown again at any time
- desktop supports compact icon-only navigation
- mobile/tablet uses an off-canvas sidebar with a backdrop
- sidebar state is remembered in the browser

### TopBoss-style navigation grouping
Navigation is now grouped more like the original website workflow:

- Management
  - Management Dashboard
  - Business Decisions
  - Decision History
- Status
  - Status / Business Status
- Analysis
  - Operations Analysis
  - Financial Ratio
  - Decision Matrices
- Performance
  - Financial Statement
  - Leaderboard
- Practice Labs
  - Competition Center
  - Workbook Lab
  - Strategy Lab
  - Robust Optimizer
  - Scenario Center
  - Model Transparency
  - Room & Setup

### Full Financial Statement page
The former snapshot cards are replaced by a round-selectable reconciliation page with:

- **Balance Sheet**
- **Cash Flow**
- **Income Statement**

The page now exposes line items such as:

- Cash
- Raw Material Inventory
- Finished Goods Inventory
- Current Assets
- Fixed & Other Assets
- Overdraft
- Owners' Equity
- Revenue
- Cash Expenditure
- Raw Material Purchase
- Equipment Investment
- Dividend
- Cost of Goods Sold
- Gross Profit
- Marketing / R&D / Maintenance expense
- Management expense
- Warehouse expense
- Purchasing expense
- Depreciation
- Operating Profit
- Interest
- Tax
- Net Earnings

### Financial Ratio page
Added a dedicated diagnostic page for:

- Current Ratio
- Quick Ratio
- Inventory Turnover
- Fixed Asset Turnover
- Total Asset Turnover
- Debt Ratio
- Times Interest Earned
- Net Profit Margin
- Basic Profit Margin
- ROA
- ROE
- ROCE

### Round-by-round financial history
Financial Statements and Ratios include a round selector so the user can inspect previous rounds rather than only the latest result.

### Excel export
The existing workbook export now also includes:

- Balance Sheet sheet
- Cash Flow sheet
- Income Statement sheet
- Financial Ratios sheet

## Evidence basis

The v1.0 parity pass was grounded in the previously extracted TopBoss walkthrough notes and Student Workbook workflow:

`Decision History → Status → Analysis → Financial Statement → next decision`

The previously supplied walkthrough notes identify the TopBoss Financial Statement page as a final reconciliation view containing Balance Sheet, Cash Flow, and Income Statement, and identify the full Financial Ratio diagnostic set.

## Important source limitation

The originally supplied raw TopBoss screen-recording MP4 is not currently retrievable by the active file runtime, so v1.0 does **not** claim a new frame-by-frame video audit in this update. The parity work uses the detailed walkthrough/extraction already recovered from that earlier material plus the Student Workbook.

## Existing features retained

- v0.9 Robust Optimizer
- v0.8 Strategy Lab + Excel export
- v0.7 Workbook R0–R5 + non-simulated R6 plan
- v0.6 Competition Command Center
- v0.5 workbook-aligned operations mechanics
- v0.4 Decision Intelligence
- v0.3 shared Team Room
- Dark / Light / System themes
- Training / Competition / Sandbox / Workbook modes

## Supabase

No new Supabase migration is required for v1.0.

## Model boundary

The expanded financial statements are generated from the transparent practice engine. For legacy rounds that were saved before line-item financial data existed, detail is reconstructed from stored round history and marked as derived. The simulator still does not claim the proprietary TopBoss accounting engine or official NPV equation.
