-- MBS Practice Simulator v1.3.1
-- Hotfix for Supabase pgcrypto visibility.
-- Run this whole file once in Supabase > SQL Editor.
--
-- Root cause:
-- RPC functions are SECURITY DEFINER with search_path = public.
-- In Supabase, pgcrypto commonly lives in the extensions schema, so digest()
-- is not visible and room creation fails with PostgreSQL 42883.
--
-- This migration does not change tables or data. It only adjusts function search_path.

create extension if not exists pgcrypto with schema extensions;

alter function public.mbs_create_room_v03(text,text,text,text,jsonb)
  set search_path = public, extensions;

alter function public.mbs_join_room_v03(text,text,text,text)
  set search_path = public, extensions;

alter function public.mbs_get_room_v03(text,text,text)
  set search_path = public, extensions;

alter function public.mbs_patch_draft_v03(text,text,text,text,jsonb)
  set search_path = public, extensions;

alter function public.mbs_commit_state_v03(text,text,text,bigint,jsonb)
  set search_path = public, extensions;

alter function public.mbs_create_room(text,text,jsonb)
  set search_path = public, extensions;

alter function public.mbs_get_room(text,text)
  set search_path = public, extensions;

alter function public.mbs_update_room(text,text,jsonb)
  set search_path = public, extensions;

-- Optional verification. This should return a SHA-256 hex string.
select encode(digest('mbs-test', 'sha256'), 'hex') as pgcrypto_ok;
