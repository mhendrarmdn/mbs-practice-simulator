-- MBS Practice Simulator v0.1
-- Run once in Supabase > SQL Editor.
-- Browser clients use only RPC functions; the table itself stays locked down.

create extension if not exists pgcrypto;

create table if not exists public.mbs_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  secret_hash text not null,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.mbs_rooms enable row level security;

create or replace function public.mbs_create_room(
  p_room_code text,
  p_secret text,
  p_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mbs_rooms (
    room_code,
    secret_hash,
    state,
    updated_at
  )
  values (
    upper(p_room_code),
    encode(digest(p_secret, 'sha256'), 'hex'),
    p_state,
    now()
  );

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
set search_path = public
as $$
declare
  v_state jsonb;
begin
  select state
    into v_state
    from public.mbs_rooms
   where room_code = upper(p_room_code)
     and secret_hash = encode(digest(p_secret, 'sha256'), 'hex');

  if v_state is null then
    raise exception 'Invalid room code or room key';
  end if;

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
set search_path = public
as $$
begin
  update public.mbs_rooms
     set state = p_state,
         updated_at = now()
   where room_code = upper(p_room_code)
     and secret_hash = encode(digest(p_secret, 'sha256'), 'hex');

  if not found then
    raise exception 'Invalid room code or room key';
  end if;

  return p_state;
end;
$$;

revoke all on public.mbs_rooms from anon, authenticated;

grant execute on function public.mbs_create_room(text,text,jsonb)
  to anon, authenticated;
grant execute on function public.mbs_get_room(text,text)
  to anon, authenticated;
grant execute on function public.mbs_update_room(text,text,jsonb)
  to anon, authenticated;
