# Changelog

## v1.2.1 — UI Stability Hotfix

### Fixes
- Applies the v1.2 corrective CSS to the actual production code path instead of an already-merged PR branch.
- Forces the recording-aligned light sidebar to win over legacy dark-sidebar CSS.
- Removes the duplicate in-sidebar hamburger; the topbar hamburger is the single sidebar control.
- Imports parity CSS after the legacy app stylesheet so Vite bundle order cannot revert the shell.
- Improves dashboard/page readability, round tabs, table density, panel spacing, chart markers, and mobile breakpoints.
- Adds point markers so a single completed round is still visible on trend charts.

### Cause
The previous corrective commit was pushed after PR #13 had already been merged, so it never entered main. v1.2.1 moves those corrections into a new hotfix branch based on the current main branch.

### Database
- No Supabase schema migration required.

## v1.2.0 — TopBoss Video Parity Pass

Recording-aligned information architecture and analytical pages based on the supplied contact sheets.

## v1.1.0 — UI Polish + Precision Pass

Header alignment, numeric precision, dashboard spacing, and sidebar polish.
