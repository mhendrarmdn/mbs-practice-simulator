# v1.5.0 — Captain Recovery

## Problem
Before v1.5.0, Captain authority depended on a browser-local member token. Clicking Leave Room cleared that token, so the same user could not securely reclaim the same room as Captain. Rejoining created a normal member session.

## Solution
Each room can now have a separate high-entropy Captain Recovery Code.

For new rooms, the Vercel server generates the recovery code and stores only its SHA-256 hash in Supabase. The plaintext code is returned to the Captain and saved locally for same-browser convenience.

A returning Captain can resume using:
- Room Code
- Room Key
- Captain Recovery Code
- Display Name

The resume RPC verifies all room credentials, invalidates the previous Captain session, and issues a fresh Captain member token.

## Existing rooms
Rooms created before v1.5.0 have no recovery hash. While the current Captain session is still active, use **Enable / Rotate Recovery Code** in Room & Setup before leaving.

## Security distinction
**Creator Access Code** controls who may create new rooms across the app.

**Captain Recovery Code** controls who may reclaim Captain authority for one specific room.

These are intentionally different credentials.

## Migration
Run:
`supabase/add_captain_recovery_v150.sql`

No tables are rebuilt. The migration adds one nullable hash column and three versioned RPCs.
