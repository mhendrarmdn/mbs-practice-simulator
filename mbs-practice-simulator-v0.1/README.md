# MBS Practice Simulator v0.1

Practice web app for team-based Macro Business Simulation / TopBoss-style decision training.

> **Important:** this is an independent training model. It reproduces the observed workflow and selected calibration points, but it does **not** claim to reproduce proprietary TopBoss formulas for demand, NPV, or balanced scorecard.

## Features

- Round 0 baseline + Round 1–4
- 8 management decisions:
  - Price
  - Marketing
  - R&D
  - Production request
  - Material purchase
  - Equipment investment
  - Maintenance
  - Dividend
- 9 AI competitors with different strategies
- Market demand and competitive share engine
- Production, capacity, raw material, and finished-goods constraints
- Cost structure, profit, cash, overdraft, equity, and ratios
- Practice NPV + balanced score
- Decision history and leaderboard
- Surprise events
- Local browser save
- Optional shared online room through Supabase
- Vercel-ready Vite project

## Repository structure

```text
mbs-practice-simulator-v0.1/
├── public/
│   └── favicon.svg
├── src/
│   ├── css/
│   │   └── app.css
│   └── js/
│       ├── ai.js
│       ├── app.js
│       ├── config.js
│       ├── simulator.js
│       ├── state.js
│       ├── supabase.js
│       ├── utils.js
│       └── views.js
├── supabase/
│   └── schema.sql
├── docs/
│   └── ARCHITECTURE.md
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vercel.json
└── README.md
```

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

## Build production version

```bash
npm run build
npm run preview
```

The production files will be generated in `dist/`.

## Supabase setup for shared practice rooms

1. Create a free Supabase project.
2. Open **SQL Editor**.
3. Copy all contents of `supabase/schema.sql` and run it once.
4. In Supabase project settings, copy:
   - Project URL
   - anon / publishable key
5. Open the simulator → **Room & Setup**.
6. Paste the URL and anon/publishable key.
7. Captain clicks **CREATE ONLINE ROOM**.
8. Share the generated Room Code and Room Key with teammates.

### Security note

Only use the public **anon / publishable** key in the browser. Never use the `service_role` key in this project.

## Deploy to Vercel

1. Push this folder to GitHub.
2. In Vercel choose **Add New → Project**.
3. Import the GitHub repository.
4. Vercel should detect Vite automatically.
5. Deploy.

No environment variables are required for v0.1 because Supabase credentials can be entered in the app UI and are stored locally in the browser. For a production release, move configuration and authentication to a more controlled setup.

## Calibration notes

The initial Markowitz baseline and Round 1 preset are seeded from the observed practice data used during development. The simulation formulas are transparent training approximations and live mainly in:

- `src/js/simulator.js`
- `src/js/config.js`

This makes future recalibration straightforward when more real decision → result observations become available.

## Recommended next versions

- **v0.2:** better calibration + sensitivity analysis
- **v0.3:** true user accounts and team-member presence
- **v0.4:** timer, locked competition mode, surprise-round controls
- **v1.0:** calibrated engine based on a larger TopBoss observation dataset
