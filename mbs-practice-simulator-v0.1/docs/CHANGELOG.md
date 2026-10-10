# Changelog

## v1.3.1 — Supabase Room pgcrypto Hotfix

### Fixed
- Fixes PostgreSQL error 42883 when creating/joining an online room:
  `function digest(text, unknown) does not exist`.
- Supabase RPC functions now use `search_path = public, extensions`, allowing pgcrypto's `digest()` to resolve on Supabase projects where extensions are installed in the `extensions` schema.
- Adds one-time migration:
  `supabase/fix_pgcrypto_search_path_v131.sql`.
- Improves the browser error message so the UI explains exactly which SQL migration is required instead of showing raw JSON.

### Database action required
Run `supabase/fix_pgcrypto_search_path_v131.sql` once in Supabase SQL Editor.

### Data safety
- No table rebuild.
- No game-room state migration.
- No row deletion.
- Existing schema/data remain intact.

## v1.3.0 — Equal-Share Competition Baseline

16-company equal-share Round 0 baseline with 6.25% market share each.
