# Changelog

## v1.4.4 — Room Creation Access Control

### Security model
- Room creation is no longer performed directly from the browser through the public Supabase key.
- New room creation goes through a Vercel server function at `/api/create-room`.
- Creating a room requires an owner-issued Creator Access Code.
- The Creator Access Code is validated server-side against `ROOM_CREATOR_ACCESS_KEY`.
- Supabase room creation is executed server-side with `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`.
- Service-role credentials never use the `VITE_` prefix and are never bundled into the browser.

### Supabase permissions
- Anonymous/authenticated clients lose EXECUTE permission on:
  - `mbs_create_room_v03`
  - `mbs_create_room`
  - legacy `mbs_update_room`
- `service_role` retains creation and legacy-update execution.
- Public clients keep token-aware v0.3 join/get/draft/commit RPC access.

### Captain / member integrity
- Revoking legacy `mbs_update_room` closes a bypass where anyone holding the shared Room Key could call the old full-state mutation RPC directly.
- Captain authority continues through `mbs_commit_state_v03`.
- Members can continue editing the shared draft through `mbs_patch_draft_v03`.

### Vercel configuration required
Add server-only environment variables:
- `ROOM_CREATOR_ACCESS_KEY` — strong owner-created value, minimum 24 characters.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role/server secret key.

Do **not** prefix either variable with `VITE_`.

Existing public deployment variables remain:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`

### Database migration required
Run once:
`supabase/restrict_room_creation_v144.sql`

### Database/data safety
- No table rebuild.
- No room deletion.
- Existing rooms continue to work.
- Migration changes function execution permissions only.

## v1.4.3 — Portable Supabase Multiplayer Config

Deployment-level public Supabase configuration for Incognito / second-device use.

## v1.4.2 — Calibration Runtime Consistency Hotfix

Restored Phase-1 calibration constants/imports and cache consistency.
