# v1.4.5 — Captain Member Kick

## Goal
Allow the room Captain to remove an unwanted or stale member session without deleting or recreating the room.

## Authorization
The browser calls:

`mbs_remove_member_v03(room_code, room_key, captain_token, member_id)`

The database does not trust the UI role label. It independently verifies that:
1. the Room Code + Room Key identify the room;
2. the supplied member token belongs to that room;
3. that token's role is `captain`;
4. the target member belongs to the same room;
5. the target is not the Captain.

Only then is the target member-session row deleted.

## Client behavior
The Captain immediately receives an updated Room Members list.

The removed browser continues to have its local cached game state, but its room token no longer exists in `mbs_room_members`. On the next polling request the server returns `Invalid room member session`. The client then:
- stops room polling,
- clears Room Code / Room Key from the active local state,
- clears the local room-session token,
- returns to Room & Setup,
- shows a removal notice.

## Important limitation
Kick is session revocation, not a permanent user ban.

The simulator does not have authenticated user identities. If the removed person still knows the Room Code + Room Key, they can create a fresh member token and join again. Preventing that properly requires an invite/identity model or room-key rotation, not a display-name blacklist.

## Migration
Run:
`supabase/add_member_removal_v145.sql`

No tables are rebuilt and existing rooms remain valid.
