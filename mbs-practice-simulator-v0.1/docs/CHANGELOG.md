# Changelog

## v1.5.0 — Competitive Analysis + Captain Recovery

### Competitive Analysis
- Replaces the 16-color spaghetti chart with a ranking snapshot while fewer than four completed rounds are available.
- MARKOWITZ is highlighted in strong blue; competitors default to neutral gray.
- From four completed rounds onward, the page switches to a multi-round trend chart with metric-aware scaling.
- Market Share uses a practical percentage range, Price/Unit Cost auto-scale around observed values, and amount axes use compact labels.
- Adds one-click metric chips, hover emphasis, and clickable competitor visibility controls on multi-round trends.
- Adds Rank and Δ vs baseline columns, sorted by selected-round metric.
- Adds automatic competitive debrief with rank, leader, and gap.
- Adds an explicit equal-share R0 baseline note for Market Share.
- Company count is derived dynamically from the active field.

### Captain Recovery
- New rooms receive a unique high-entropy Captain Recovery Code.
- Captain recovery is separate from the owner-level Creator Access Code.
- A returning Captain can resume an existing room using Room Code + Room Key + Captain Recovery Code.
- Resume works from a new browser/device and issues a fresh Captain session.
- Existing pre-v1.5 rooms can enable or rotate recovery while the Captain is still logged in.
- Same-browser recovery credentials are retained locally after Leave Room for convenience.
- The recovery code is stored in Supabase only as a SHA-256 hash.

### Security model
- Room creation remains owner-gated through the v1.4.4 server endpoint.
- New room creation uses `mbs_create_room_v04` through the server-only Supabase secret key.
- Resuming Captain invalidates the previous Captain session while preserving normal members.

### Database migration required
Run once:
`supabase/add_captain_recovery_v150.sql`

Existing rooms and game state are preserved.

## v1.4.6 — Kick Button Render Hotfix
Restored Captain-only Kick controls in Room & Setup.

## v1.4.5 — Captain Member Kick
Captain-authorized member-session removal.

## v1.4.4 — Room Creation Access Control
Server-side owner-gated room creation.
