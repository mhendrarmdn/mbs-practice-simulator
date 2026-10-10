# MBS Practice Simulator v0.3

Independent web-based training simulator for Macro Business Simulation / TopBoss-style competition practice.

> This is a **training twin**, not an official TopBoss clone. Observed values are calibration anchors; simulator formulas remain transparent practice approximations.

## v0.3 focus — Team Room

v0.3 keeps the Floot-style cockpit UI and all v0.2 features, while upgrading the shared-room layer:

- per-member room sessions
- Captain / Member roles
- member display names and online presence
- atomic shared decision-field updates
- server-side room revision counter
- optimistic conflict protection for Captain commits
- Captain-only round submit, mode changes, scenario control, reset, and team rename
- shared Competition deadline so browsers follow the same countdown
- graceful fallback to the legacy v0.1 room RPCs
- automatic local-save migration from v0.1/v0.2

## Existing simulation features

- Round 0 baseline + Round 1–4
- 8 management decisions
- 9 adaptive AI competitors
- Dark / Light / System theme
- Training / Competition / Sandbox modes
- Competition timer and locking
- Sensitivity Lab
- Surprise Scenario Center
- Financial health alerts
- Decision History with deltas
- Practice NPV + Balanced Score proxies
- Save export/import JSON
- Model Transparency
- responsive Floot-style competition cockpit

## Deploy

The Vercel-compatible app remains inside:

`mbs-practice-simulator-v0.1/`

This folder name is intentionally preserved so the existing Vercel Root Directory does not need to change.

## Upgrade Supabase for v0.3 rooms

1. Open Supabase → **SQL Editor**.
2. Run the latest `supabase/schema.sql` once.
3. Reload the deployed app.
4. Open **Room & Setup**.
5. Enter Project URL + public anon/publishable key.
6. Captain creates a new room and shares Room Code + Room Key.
7. Teammates join using individual display names.

See `docs/ROOM_V03_MIGRATION.md`.

Never use the Supabase `service_role` key in the browser.

## Model boundary

The project does not claim access to proprietary TopBoss demand, NPV, balanced-score, or other internal formulas.
