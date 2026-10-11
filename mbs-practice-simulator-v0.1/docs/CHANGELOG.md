# Changelog

## v1.4.3 — Portable Supabase Multiplayer Config

### Incognito / second-device fix
- Supabase connection no longer depends exclusively on browser localStorage.
- Supports Vercel/Vite deployment defaults:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` as an alternate key variable.
- Browser-saved config still works as an override.
- Empty setup fields no longer overwrite valid deployment defaults.

### Room & Setup
- Shows whether the current Supabase connection came from Deployment default, Browser override, or Not configured.
- Improves the error message when a fresh Incognito/device has no Supabase configuration.

### Security
- Only the public anon/publishable key belongs in these client-side deployment variables.
- Never use a Supabase service-role key in Vercel client-side variables.

### Database
- No Supabase SQL migration required for v1.4.3.
- The v1.3.1 pgcrypto migration remains required once per Supabase project.

## v1.4.2 — Calibration Runtime Consistency Hotfix

Restored Phase-1 constants/imports, controlled Workbook calibration environment, cache consistency, and R0 snapshot clarification.

## v1.4.1 — Competition / Optimizer Stability Hotfix

Scenario isolation, memoization, lighter optimizer workload, and safe render recovery.
