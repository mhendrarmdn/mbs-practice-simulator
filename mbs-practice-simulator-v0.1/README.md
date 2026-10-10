# MBS Practice Simulator v0.2

Independent web-based training simulator for Macro Business Simulation / TopBoss-style competition practice.

> This is a **training twin**, not an official TopBoss clone. Observed values are used as calibration anchors, while demand, Practice NPV, Balanced Score, AI behavior, and several finance/cost relationships remain transparent training approximations.

## v0.2 highlights

- Round 0 baseline + Round 1–4
- 8 management decisions: Price, Marketing, R&D, Production, Material Purchase, Equipment, Maintenance, Dividend
- 9 adaptive AI competitors
- Dark / Light / System theme
- Training / Competition / Sandbox modes
- Competition timer + decision locking
- Sensitivity Lab
- Surprise Scenario Center + event history
- Financial health alerts
- Improved Decision History with round-over-round deltas
- Export / import save JSON
- Model Transparency panel
- Optional Supabase shared team room
- Responsive Vercel-ready Vite app
- Automatic migration from v0.1 browser save

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

## Deploy to Vercel

This repository keeps the deployable app inside `mbs-practice-simulator-v0.1/` for compatibility with the existing Vercel project. Keep Vercel's **Root Directory** pointed to that folder.

When this branch is merged into `main`, a Git-integrated Vercel project should automatically rebuild and redeploy.

## Supabase shared rooms

1. Create a Supabase project.
2. Run `supabase/schema.sql` in SQL Editor.
3. Copy Project URL + public anon/publishable key.
4. Open **Room & Setup** in the simulator.
5. Create or join a room.

Never use the Supabase `service_role` key in the browser.

## Calibration anchors

The simulator preserves known observed anchors including Round 0 revenue/sales/price/share/profit/unit cost and selected Round 1 demand, sales, inventory, cost, revenue, earnings, overdraft, and equity values.

See **Model Transparency** in the app and `docs/CHANGELOG.md`.

## Core model files

- `src/js/simulator.js` — market, operations, finance, NPV proxy, balanced-score proxy
- `src/js/ai.js` — adaptive competitor strategies
- `src/js/state.js` — baseline, save migration, round history
- `src/js/sensitivity.js` — what-if directional preview
- `src/js/theme.js` — theme handling
- `src/js/persistence.js` — save export/import
- `src/js/supabase.js` — optional shared-room client
