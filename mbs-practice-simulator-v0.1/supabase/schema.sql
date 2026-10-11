-- MBS Practice Simulator v0.3
-- Run this whole file in Supabase > SQL Editor.
-- Safe to run over the v0.1 schema: it adds revision + member presence while keeping legacy RPCs.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mbs_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  secret_hash text not null,
  state jsonb not null,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.mbs_rooms add column if not exists revision bigint not null default 0;
alter table public.mbs_rooms enable row level security;

create table if not exists public.mbs_room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.mbs_rooms(id) on delete cascade,
  member_token_hash text not null,
  display_name text not null,
  role text not null check (role in ('captain','member')),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(room_id, member_token_hash)
);

alter table public.mbs_room_members enable row level security;
revoke all on public.mbs_rooms from anon, authenticated;
revoke all on public.mbs_room_members from anon, authenticated;

create or replace function public.mbs_create_room_v03(
  p_room_code text,
  p_secret text,
  p_captain_token text,
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
begin
  v_state := (p_state - 'roomMembers') || jsonb_build_object('revision', 0, 'updatedAt', now()::text);

  insert into public.mbs_rooms(room_code, secret_hash, state, revision, updated_at)
  values(
    upper(p_room_code),
    encode(digest(p_secret, 'sha256'), 'hex'),
    v_state,
    0,
    now()
  )
  returning id into v_room_id;

  insert into public.mbs_room_members(room_id, member_token_hash, display_name, role, last_seen)
  values(
    v_room_id,
    encode(digest(p_captain_token, 'sha256'), 'hex'),
    left(coalesce(nullif(trim(p_display_name), ''), 'Captain'), 40),
    'captain',
    now()
  )
  returning id into v_member_id;

  return jsonb_build_object(
    'state', v_state,
    'revision', 0,
    'role', 'captain',
    'member_id', v_member_id,
    'display_name', left(coalesce(nullif(trim(p_display_name), ''), 'Captain'), 40),
    'members', jsonb_build_array(jsonb_build_object(
      'id', v_member_id,
      'displayName', left(coalesce(nullif(trim(p_display_name), ''), 'Captain'), 40),
      'role', 'captain',
      'online', true,
      'lastSeen', now()
    ))
  );
end;
$$;

create or replace function public.mbs_join_room_v03(
  p_room_code text,
  p_secret text,
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
  v_member public.mbs_room_members%rowtype;
  v_members jsonb;
begin
  select * into v_room
  from public.mbs_rooms
  where room_code = upper(p_room_code)
    and secret_hash = encode(digest(p_secret, 'sha256'), 'hex');

  if v_room.id is null then
    raise exception 'Invalid room code or room key';
  end if;

  insert into public.mbs_room_members(room_id, member_token_hash, display_name, role, last_seen)
  values(
    v_room.id,
    encode(digest(p_member_token, 'sha256'), 'hex'),
    left(coalesce(nullif(trim(p_display_name), ''), 'Member'), 40),
    'member',
    now()
  )
  on conflict(room_id, member_token_hash)
  do update set display_name = excluded.display_name, last_seen = now()
  returning * into v_member;

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
    'role', v_member.role,
    'member_id', v_member.id,
    'display_name', v_member.display_name,
    'members', v_members
  );
end;
$$;

create or replace function public.mbs_get_room_v03(
  p_room_code text,
  p_secret text,
  p_member_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room public.mbs_rooms%rowtype;
  v_member public.mbs_room_members%rowtype;
  v_members jsonb;
begin
  select * into v_room
  from public.mbs_rooms
  where room_code = upper(p_room_code)
    and secret_hash = encode(digest(p_secret, 'sha256'), 'hex');

  if v_room.id is null then
    raise exception 'Invalid room code or room key';
  end if;

  select * into v_member
  from public.mbs_room_members
  where room_id = v_room.id
    and member_token_hash = encode(digest(p_member_token, 'sha256'), 'hex');

  if v_member.id is null then
    raise exception 'Invalid room member session';
  end if;

  update public.mbs_room_members
  set last_seen = now()
  where id = v_member.id;

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
    'role', v_member.role,
    'member_id', v_member.id,
    'display_name', v_member.display_name,
    'members', v_members
  );
end;
$$;

create or replace function public.mbs_patch_draft_v03(
  p_room_code text,
  p_secret text,
  p_member_token text,
  p_field text,
  p_value jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room_id uuid;
  v_revision bigint;
  v_state jsonb;
begin
  if p_field not in ('price','marketing','rd','production','materialPurchase','equipment','maintenance','dividend') then
    raise exception 'Invalid decision field';
  end if;

  select r.id into v_room_id
  from public.mbs_rooms r
  join public.mbs_room_members m on m.room_id = r.id
  where r.room_code = upper(p_room_code)
    and r.secret_hash = encode(digest(p_secret, 'sha256'), 'hex')
    and m.member_token_hash = encode(digest(p_member_token, 'sha256'), 'hex');

  if v_room_id is null then
    raise exception 'Invalid room or member session';
  end if;

  update public.mbs_room_members
  set last_seen = now()
  where room_id = v_room_id
    and member_token_hash = encode(digest(p_member_token, 'sha256'), 'hex');

  update public.mbs_rooms
  set state = jsonb_set(
        jsonb_set(state, array['draft', p_field], p_value, true),
        '{updatedAt}',
        to_jsonb(now()::text),
        true
      ),
      revision = revision + 1,
      updated_at = now()
  where id = v_room_id
  returning revision, state into v_revision, v_state;

  return jsonb_build_object('revision', v_revision, 'state', v_state);
end;
$$;

create or replace function public.mbs_commit_state_v03(
  p_room_code text,
  p_secret text,
  p_member_token text,
  p_expected_revision bigint,
  p_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room_id uuid;
  v_role text;
  v_revision bigint;
  v_state jsonb;
begin
  select r.id, m.role into v_room_id, v_role
  from public.mbs_rooms r
  join public.mbs_room_members m on m.room_id = r.id
  where r.room_code = upper(p_room_code)
    and r.secret_hash = encode(digest(p_secret, 'sha256'), 'hex')
    and m.member_token_hash = encode(digest(p_member_token, 'sha256'), 'hex');

  if v_room_id is null then
    raise exception 'Invalid room or member session';
  end if;
  if v_role <> 'captain' then
    raise exception 'Captain permission required';
  end if;

  update public.mbs_rooms
  set state = (p_state - 'roomMembers') || jsonb_build_object(
        'revision', revision + 1,
        'updatedAt', now()::text
      ),
      revision = revision + 1,
      updated_at = now()
  where id = v_room_id
    and revision = p_expected_revision
  returning revision, state into v_revision, v_state;

  if v_revision is null then
    raise exception 'REVISION_CONFLICT';
  end if;

  update public.mbs_room_members
  set last_seen = now()
  where room_id = v_room_id
    and member_token_hash = encode(digest(p_member_token, 'sha256'), 'hex');

  return jsonb_build_object('revision', v_revision, 'state', v_state);
end;
$$;

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
as $
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
$;

revoke execute on function public.mbs_remove_member_v03(text,text,text,uuid) from PUBLIC;
grant execute on function public.mbs_remove_member_v03(text,text,text,uuid) to anon, authenticated;

-- Legacy RPCs kept for older clients / graceful fallback.

create or replace function public.mbs_create_room(
  p_room_code text,
  p_secret text,
  p_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.mbs_rooms(room_code, secret_hash, state, revision, updated_at)
  values(upper(p_room_code), encode(digest(p_secret, 'sha256'), 'hex'), p_state, 0, now());
  return p_state;
end;
$$;

create or replace function public.mbs_get_room(
  p_room_code text,
  p_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_state jsonb;
begin
  select state into v_state
  from public.mbs_rooms
  where room_code = upper(p_room_code)
    and secret_hash = encode(digest(p_secret, 'sha256'), 'hex');
  if v_state is null then raise exception 'Invalid room code or room key'; end if;
  return v_state;
end;
$$;

create or replace function public.mbs_update_room(
  p_room_code text,
  p_secret text,
  p_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.mbs_rooms
  set state = p_state, revision = revision + 1, updated_at = now()
  where room_code = upper(p_room_code)
    and secret_hash = encode(digest(p_secret, 'sha256'), 'hex');
  if not found then raise exception 'Invalid room code or room key'; end if;
  return p_state;
end;
$$;

revoke execute on function public.mbs_create_room_v03(text,text,text,text,jsonb) from PUBLIC, anon, authenticated;
grant execute on function public.mbs_create_room_v03(text,text,text,text,jsonb) to service_role;
grant execute on function public.mbs_join_room_v03(text,text,text,text) to anon, authenticated;
grant execute on function public.mbs_get_room_v03(text,text,text) to anon, authenticated;
grant execute on function public.mbs_patch_draft_v03(text,text,text,text,jsonb) to anon, authenticated;
grant execute on function public.mbs_commit_state_v03(text,text,text,bigint,jsonb) to anon, authenticated;
revoke execute on function public.mbs_create_room(text,text,jsonb) from PUBLIC, anon, authenticated;
grant execute on function public.mbs_create_room(text,text,jsonb) to service_role;
grant execute on function public.mbs_get_room(text,text) to anon, authenticated;
revoke execute on function public.mbs_update_room(text,text,jsonb) from PUBLIC, anon, authenticated;
grant execute on function public.mbs_update_room(text,text,jsonb) to service_role;


-- v1.5.0 Captain recovery / resume
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

