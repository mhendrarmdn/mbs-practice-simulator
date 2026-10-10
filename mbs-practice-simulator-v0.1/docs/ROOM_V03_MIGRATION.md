# v0.3 Team Room Migration

v0.3 hardens the optional shared-room layer. Local practice still works with no database.

## What changes

- room state now has a server-side `revision`
- every browser gets a separate member session token
- room members have display names, roles, and presence timestamps
- decision inputs are patched atomically by field
- only the captain session can commit a full round state
- captain submits against an expected revision to prevent stale overwrites
- the app polls the canonical room state and shows online presence
- old v0.1 RPCs remain as a graceful fallback

## Upgrade an existing Supabase project

1. Open Supabase → SQL Editor.
2. Paste the current `supabase/schema.sql`.
3. Run the whole file once.
4. Reload the deployed simulator.
5. Create a fresh v0.3 room for the cleanest member-session setup.

Existing local save games migrate automatically. Existing legacy online rooms can still fall back to the v0.1 RPCs, but presence and captain enforcement require the v0.3 RPCs.

## Security boundary

The room key and per-member token act as practice-room bearer credentials. This is materially safer than the v0.1 shared secret + whole-state write model, but it is not an enterprise identity system. For a future public product, use Supabase Auth plus authenticated RLS membership.
