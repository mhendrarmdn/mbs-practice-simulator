# v1.4.4 — Room Creation Access Control

## Why this change exists

The Supabase publishable/anon key is intentionally public. In v1.4.3, the room-creation RPC was also executable by the `anon` role. That meant any visitor who could load the website could create a new room.

v1.4.4 separates public multiplayer access from privileged room creation.

## New trust boundary

### Public browser
Can:
- load the simulator,
- use the publishable Supabase key,
- join a room with Room Code + Room Key,
- participate through the token-aware v0.3 RPC workflow.

Cannot:
- call the database room-creation RPC directly,
- use the legacy full-state update RPC.

### Authorized creator
Must enter a Creator Access Code in the UI.

The code is sent to the same-origin Vercel function `/api/create-room`. The browser never receives the server's configured creator secret or service-role key.

### Vercel server function
Checks:
1. request method,
2. Creator Access Code,
3. room code/key format,
4. captain token,
5. state shape/size.

Then calls `mbs_create_room_v03` with a server-only Supabase service-role key.

## Required Vercel environment variables

Public build variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`

Server-only variables:
- `ROOM_CREATOR_ACCESS_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`)

Never use a `VITE_` prefix for server-only values.

Use a strong Creator Access Code of at least 24 characters. Treat it as an owner/captain authorization secret and share it only with people allowed to create rooms.

## Required Supabase migration

Run:

`supabase/restrict_room_creation_v144.sql`

This revokes public EXECUTE permission from:
- `mbs_create_room_v03`
- `mbs_create_room`
- `mbs_update_room`

and grants room creation to `service_role`.

## Existing rooms

Existing rooms remain valid. Join, presence, draft sync, and captain commit continue through the v0.3 token-aware RPCs.

## Security limitation

A Creator Access Code is an application-level shared secret. Anyone who receives it can create rooms until you rotate `ROOM_CREATOR_ACCESS_KEY` in Vercel. Rotate it if it is exposed.
