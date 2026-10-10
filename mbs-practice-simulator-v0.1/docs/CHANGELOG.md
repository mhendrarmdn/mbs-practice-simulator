# Changelog

## v0.3.0

### Team room
- Added per-member session tokens and display names.
- Added Captain and Member roles.
- Added online/away presence indicators.
- Added atomic shared-draft field patches.
- Added server-side revision numbers.
- Added optimistic conflict protection for Captain full-state commits.
- Added Captain-only authority for round submit and control settings.
- Added shared Competition deadline support.
- Fixed the v0.1/v0.2 remote-sync timestamp thrash pattern by caching remote state without touching its timestamp.
- Preserved legacy RPC fallback for older Supabase schemas.

### UI
- Preserves the Floot-style MBS ARENA cockpit introduced after v0.2.
- Adds room role, revision, member list, and online-count surfaces.

### Compatibility
- Local saves from v0.1 and v0.2 migrate into v0.3.
- Existing Vercel Root Directory remains unchanged.

## v0.2.0

- Added Light / Dark / System themes.
- Added Training, Competition, and Sandbox modes.
- Added Competition countdown timer and decision locking.
- Added Sensitivity Lab.
- Added adaptive AI competitors.
- Added Scenario Center and event history.
- Added financial health alerts.
- Improved Decision History.
- Added save export/import.
- Added Model Transparency.
- Reworked the interface into a Floot-style competition cockpit.

## Model boundary

This project remains an independent training simulator and does not claim to reproduce proprietary TopBoss formulas.
