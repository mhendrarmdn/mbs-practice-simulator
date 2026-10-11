# Changelog

## v1.4.6 — Kick Button Render Hotfix

### Fixed
- Restores the Captain-only Kick button in Room & Setup.
- Fixes the stale sidebar version label that still showed v1.4.4 after the v1.4.5 deployment.
- Keeps the existing v1.4.5 database removal RPC and client session-revocation logic unchanged.

### Cause
The previous v1.4.5 merge included the backend removal flow and explanatory callout, but the final `views.js` blob was built from the pre-v1.4.5 base and therefore did not include the updated Room Members row renderer.

### Database
- No new migration for v1.4.6.
- `supabase/add_member_removal_v145.sql` is still required once.


## v1.4.5 — Captain Member Kick

### Room moderation
- Captain can now remove any non-captain member from the current room directly from Room & Setup.
- A Kick button appears only for the Captain and only on member rows.
- The database validates the Captain token before removing the target member.
- Captain cannot remove the Captain session.

### Revoked session behavior
- Removing a member deletes that member's active room-session row.
- On the removed member's next sync cycle, the app detects the invalid member session, clears the room session locally, returns the user to Room & Setup, and explains that the Captain removed them.
- Other room members remain connected.

### Rejoin limitation
- Kick revokes the current session; it is not a permanent ban.
- A removed person who still knows the Room Code + Room Key can join again as a new session.
- Permanent bans / invite rotation are intentionally not simulated by display name because that would provide weak security.

### Database migration required
Run once:
`supabase/add_member_removal_v145.sql`

This adds:
`mbs_remove_member_v03(text,text,text,uuid)`

The RPC is callable from the public client, but it only succeeds when the supplied room member token belongs to the room Captain.

### Database/data safety
- No room or game-state deletion.
- No table rebuild.
- Existing rooms remain valid.
- Only the selected member-session row is removed.

## v1.4.4 — Room Creation Access Control

Server-side owner-gated room creation and public create-RPC lockdown.

## v1.4.3 — Portable Supabase Multiplayer Config

Deployment-level public Supabase configuration for Incognito and second-device use.
