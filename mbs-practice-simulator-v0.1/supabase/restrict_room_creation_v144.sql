-- MBS Practice Simulator v1.4.4
-- Room Creation Access Control
-- Run once in Supabase > SQL Editor AFTER deploying v1.4.4.
--
-- Goal:
-- 1) Public clients can still join/read/patch draft through token-aware v0.3 RPCs.
-- 2) Public clients can no longer create rooms directly.
-- 3) Public clients can no longer bypass captain authority through legacy full-state update.
-- 4) Vercel server function creates rooms with the server-only service role key.

revoke execute on function public.mbs_create_room_v03(text,text,text,text,jsonb)
  from PUBLIC, anon, authenticated;
grant execute on function public.mbs_create_room_v03(text,text,text,text,jsonb)
  to service_role;

revoke execute on function public.mbs_create_room(text,text,jsonb)
  from PUBLIC, anon, authenticated;
grant execute on function public.mbs_create_room(text,text,jsonb)
  to service_role;

-- Prevent a member who knows the shared Room Key from bypassing captain/member
-- controls via the old full-state mutation RPC.
revoke execute on function public.mbs_update_room(text,text,jsonb)
  from PUBLIC, anon, authenticated;
grant execute on function public.mbs_update_room(text,text,jsonb)
  to service_role;

-- Keep the token-aware v0.3 room workflow available to public clients.
grant execute on function public.mbs_join_room_v03(text,text,text,text)
  to anon, authenticated;
grant execute on function public.mbs_get_room_v03(text,text,text)
  to anon, authenticated;
grant execute on function public.mbs_patch_draft_v03(text,text,text,text,jsonb)
  to anon, authenticated;
grant execute on function public.mbs_commit_state_v03(text,text,text,bigint,jsonb)
  to anon, authenticated;

-- Optional verification: only service_role should retain create/update execution.
select
  p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('mbs_create_room_v03','mbs_create_room','mbs_update_room')
order by p.proname;
