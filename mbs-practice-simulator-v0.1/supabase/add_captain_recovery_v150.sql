-- MBS Practice Simulator v1.5.0
-- Captain Recovery / Resume
-- Run once in Supabase > SQL Editor.

alter table public.mbs_rooms
  add column if not exists captain_recovery_hash text;

create or replace function public.mbs_create_room_v04(
  p_room_code text,
  p_secret text,
  p_captain_token text,
  p_captain_recovery_code text,
  p_display_name text,
  p_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room_id uuid;
  v_member_id uuid;
  v_state jsonb;
  v_name text;
begin
  if length(coalesce(p_captain_recovery_code,'')) < 20 then
    raise exception 'Captain recovery code too short';
  end if;

  v_name := left(coalesce(nullif(trim(p_display_name), ''), 'Captain'), 40);
  v_state := (p_state - 'roomMembers') || jsonb_build_object('revision', 0, 'updatedAt', now()::text);

  insert into public.mbs_rooms(
    room_code,
    secret_hash,
    captain_recovery_hash,
    state,
    revision,
    updated_at
  )
  values(
    upper(p_room_code),
    encode(digest(p_secret, 'sha256'), 'hex'),
    encode(digest(p_captain_recovery_code, 'sha256'), 'hex'),
    v_state,
    0,
    now()
  )
  returning id into v_room_id;

  insert into public.mbs_room_members(
    room_id,
    member_token_hash,
    display_name,
    role,
    last_seen
  )
  values(
    v_room_id,
    encode(digest(p_captain_token, 'sha256'), 'hex'),
    v_name,
    'captain',
    now()
  )
  returning id into v_member_id;

  return jsonb_build_object(
    'state', v_state,
    'revision', 0,
    'role', 'captain',
    'member_id', v_member_id,
    'display_name', v_name,
    'members', jsonb_build_array(jsonb_build_object(
      'id', v_member_id,
      'displayName', v_name,
      'role', 'captain',
      'online', true,
      'lastSeen', now()
    ))
  );
end;
$$;

create or replace function public.mbs_set_captain_recovery_v04(
  p_room_code text,
  p_secret text,
  p_captain_token text,
  p_recovery_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room public.mbs_rooms%rowtype;
  v_captain public.mbs_room_members%rowtype;
begin
  if length(coalesce(p_recovery_code,'')) < 20 then
    raise exception 'Captain recovery code too short';
  end if;

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

  update public.mbs_rooms
  set captain_recovery_hash = encode(digest(p_recovery_code, 'sha256'), 'hex'),
      updated_at = now()
  where id = v_room.id;

  update public.mbs_room_members
  set last_seen = now()
  where id = v_captain.id;

  return jsonb_build_object('ok', true, 'room_code', v_room.room_code);
end;
$$;

create or replace function public.mbs_resume_captain_v04(
  p_room_code text,
  p_secret text,
  p_recovery_code text,
  p_member_token text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room public.mbs_rooms%rowtype;
  v_member_id uuid;
  v_members jsonb;
  v_name text;
begin
  select * into v_room
  from public.mbs_rooms
  where room_code = upper(p_room_code)
    and secret_hash = encode(digest(p_secret, 'sha256'), 'hex')
    and captain_recovery_hash is not null
    and captain_recovery_hash = encode(digest(p_recovery_code, 'sha256'), 'hex');

  if v_room.id is null then
    raise exception 'Invalid Captain recovery credentials';
  end if;

  v_name := left(coalesce(nullif(trim(p_display_name), ''), 'Captain'), 40);

  delete from public.mbs_room_members
  where room_id = v_room.id
    and role = 'captain';

  insert into public.mbs_room_members(
    room_id,
    member_token_hash,
    display_name,
    role,
    last_seen
  )
  values(
    v_room.id,
    encode(digest(p_member_token, 'sha256'), 'hex'),
    v_name,
    'captain',
    now()
  )
  returning id into v_member_id;

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
    'role', 'captain',
    'member_id', v_member_id,
    'display_name', v_name,
    'members', v_members
  );
end;
$$;

revoke execute on function public.mbs_create_room_v04(text,text,text,text,text,jsonb)
  from PUBLIC, anon, authenticated;
grant execute on function public.mbs_create_room_v04(text,text,text,text,text,jsonb)
  to service_role;

revoke execute on function public.mbs_set_captain_recovery_v04(text,text,text,text)
  from PUBLIC;
grant execute on function public.mbs_set_captain_recovery_v04(text,text,text,text)
  to anon, authenticated;

revoke execute on function public.mbs_resume_captain_v04(text,text,text,text,text)
  from PUBLIC;
grant execute on function public.mbs_resume_captain_v04(text,text,text,text,text)
  to anon, authenticated;

-- Verify expected permissions.
select
  p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public'
  and p.proname in ('mbs_create_room_v04','mbs_set_captain_recovery_v04','mbs_resume_captain_v04')
order by p.proname;
