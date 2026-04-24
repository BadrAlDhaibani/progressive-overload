-- Provolone — Push notifications: tokens, prefs, dedup, per-friend mute
-- Run this in the Supabase SQL editor once.
--
-- Backs the notify-workout-start edge function. Client stores Expo push tokens
-- on sign-in; edge function fans out pushes to accepted friends on first-set
-- completion, filtered by per-user prefs and a 2-hour per-(actor,recipient)
-- dedup window.

-- ─── push_tokens ──────────────────────────────────────────────────────────
-- One row per device install. A user can have multiple rows (multi-device).
create table if not exists public.push_tokens (
  expo_token  text primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  platform    text not null check (platform in ('ios','android')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

create or replace function public.touch_push_tokens_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists push_tokens_touch_updated_at on public.push_tokens;
create trigger push_tokens_touch_updated_at
  before update on public.push_tokens
  for each row execute function public.touch_push_tokens_updated_at();

alter table public.push_tokens enable row level security;

drop policy if exists push_tokens_select on public.push_tokens;
create policy push_tokens_select on public.push_tokens for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists push_tokens_insert on public.push_tokens;
create policy push_tokens_insert on public.push_tokens for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists push_tokens_update on public.push_tokens;
create policy push_tokens_update on public.push_tokens for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists push_tokens_delete on public.push_tokens;
create policy push_tokens_delete on public.push_tokens for delete
  to authenticated
  using (user_id = auth.uid());

-- ─── notification_prefs ───────────────────────────────────────────────────
-- Missing row = all defaults on. Lazily created by the client only when the
-- user toggles something off.
create table if not exists public.notification_prefs (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  send_enabled     boolean not null default true,
  receive_enabled  boolean not null default true,
  updated_at       timestamptz not null default now()
);

create or replace function public.touch_notification_prefs_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists notification_prefs_touch_updated_at on public.notification_prefs;
create trigger notification_prefs_touch_updated_at
  before update on public.notification_prefs
  for each row execute function public.touch_notification_prefs_updated_at();

alter table public.notification_prefs enable row level security;

drop policy if exists notification_prefs_select on public.notification_prefs;
create policy notification_prefs_select on public.notification_prefs for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists notification_prefs_insert on public.notification_prefs;
create policy notification_prefs_insert on public.notification_prefs for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists notification_prefs_update on public.notification_prefs;
create policy notification_prefs_update on public.notification_prefs for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── per-friend mute on friendships ───────────────────────────────────────
-- `friendships` is a single row per pair. Mute is one-way (I mute A → I stop
-- receiving A's workout pushes; A still gets mine). Split into two columns so
-- each viewer can mute independently.
alter table public.friendships
  add column if not exists mute_by_requester boolean not null default false,
  add column if not exists mute_by_recipient boolean not null default false;

-- ─── notifications_sent (dedup) ───────────────────────────────────────────
-- Every successful (actor → recipient) push writes a row. The edge function
-- scans this table with a 2h lookback to skip recent recipients.
create table if not exists public.notifications_sent (
  actor_id      uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  sent_at       timestamptz not null default now(),
  primary key (actor_id, recipient_id, sent_at)
);

create index if not exists notifications_sent_lookup_idx
  on public.notifications_sent (actor_id, recipient_id, sent_at desc);

-- Only the edge function (service role) touches this table. Enable RLS with
-- zero policies to block anon/authenticated reads and writes.
alter table public.notifications_sent enable row level security;
