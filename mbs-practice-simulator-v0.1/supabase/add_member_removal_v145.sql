-- MBS Practice Simulator v1.4.5
-- Captain member removal
-- Run once in Supabase > SQL Editor after deploying v1.4.5.

create or replace function public.mbs_remove_member_v03(
  p_room_code text,
  p_secret text,
  p_captain_token text,
  p_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room public.mbs_rooms%rowtype;
  v_captain public.mbs_room_members%rowtype;
  v_target public.mbs_room_members%rowtype;
  v_members jsonb;
begin
  select * into v_room
  from public.mbs_rooms
  where room_code = upper(p_room_code)
    and secret_hash = encode(digest(p_secret, 'sha256'), 'hex');

  if v_room.id is null then
    raise exception 'Invalid room code or room key';
  end if;

  select * into v_captain
  from public.mbs_room_members
  where room_id = v_room.id
    and member_token_hash = encode(digest(p_captain_token, 'sha256'), 'hex')
    and role = 'captain';

  if v_captain.id is null then
    raise exception 'Captain permission required';
  end if;

  select * into v_target
  from public.mbs_room_members
  where id = p_member_id
    and room_id = v_room.id;

  if v_target.id is null then
    raise exception 'Member not found';
  end if;

  if v_target.role = 'captain' then
    raise exception 'Captain cannot remove self';
  end if;

  delete from public.mbs_room_members
  where id = v_target.id
    and room_id = v_room.id;

  update public.mbs_room_members
  set last_seen = now()
  where id = v_captain.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'displayName', m.display_name,
    'role', m.role,
    'online', m.last_seen > now() - interval '20 seconds',
    'lastSeen', m.last_seen
  ) order by case when m.role = 'captain' then 0 else 1 end, m.created_at), '[]'::jsonb)
  into v_members
  from public.mbs_room_members m
  where m.room_id = v_room.id;

  return jsonb_build_object(
    'state', v_room.state,
    'revision', v_room.revision,
    'members', v_members,
    'removed_member_id', v_target.id
  );
end;
$$;

revoke execute on function public.mbs_remove_member_v03(text,text,text,uuid) from PUBLIC;
grant execute on function public.mbs_remove_member_v03(text,text,text,uuid) to anon, authenticated;

-- Verification: anon can call the RPC endpoint, but the function itself
-- still requires a valid Captain member token before deleting anyone.
select
  has_function_privilege('anon', 'public.mbs_remove_member_v03(text,text,text,uuid)', 'EXECUTE') as anon_rpc_available,
  has_function_privilege('authenticated', 'public.mbs_remove_member_v03(text,text,text,uuid)', 'EXECUTE') as authenticated_rpc_available;
