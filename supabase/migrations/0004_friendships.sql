-- Provolone — Mutual-accept friendships + friends-only leaderboard
-- Run this in the Supabase SQL editor once.
--
-- Requires Postgres 15+ for `security_invoker = on` on the leaderboard view.
-- Supabase has been on 15+ since 2023, so no action needed.

-- ─── friendships ───────────────────────────────────────────────────────────
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null check (status in ('pending','accepted')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  constraint friendships_no_self check (requester_id <> recipient_id)
);

-- unique pair regardless of direction (standard UNIQUE(a,b) would allow the swapped pair)
create unique index if not exists friendships_pair_uniq
  on public.friendships (least(requester_id, recipient_id),
                         greatest(requester_id, recipient_id));

create index if not exists friendships_recipient_pending_idx
  on public.friendships (recipient_id) where status = 'pending';
create index if not exists friendships_requester_pending_idx
  on public.friendships (requester_id) where status = 'pending';
create index if not exists friendships_accepted_idx
  on public.friendships (requester_id, recipient_id) where status = 'accepted';

-- ─── touch updated_at on row modification ─────────────────────────────────
create or replace function public.touch_friendships_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists friendships_touch_updated_at on public.friendships;
create trigger friendships_touch_updated_at
  before update on public.friendships
  for each row execute function public.touch_friendships_updated_at();

-- ─── are_friends helper (mirrors is_chat_member from 0001) ─────────────────
create or replace function public.are_friends(_a uuid, _b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = _a and recipient_id = _b)
        or (requester_id = _b and recipient_id = _a))
  );
$$;

-- ─── send_friend_request RPC (atomic lookup + dedup + insert) ──────────────
create or replace function public.send_friend_request(target_username text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me        uuid := auth.uid();
  other     uuid;
  existing  record;
  new_id    uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select id into other from public.profiles where lower(username) = lower(target_username);
  if other is null then raise exception 'user not found'; end if;
  if other = me then raise exception 'cannot friend yourself'; end if;

  select id, status, requester_id into existing
  from public.friendships
  where (requester_id = me    and recipient_id = other)
     or (requester_id = other and recipient_id = me)
  limit 1;

  if existing.id is not null then
    if existing.status = 'accepted' then
      raise exception 'already friends';
    end if;
    if existing.requester_id = me then
      raise exception 'request already sent';
    end if;
    raise exception 'pending request from this user';
  end if;

  begin
    insert into public.friendships (requester_id, recipient_id, status)
    values (me, other, 'pending')
    returning id into new_id;
  exception when unique_violation then
    -- Lost a concurrent insert race against the same pair.
    -- Re-read and raise the same curated message a non-racing caller would see.
    select id, status, requester_id into existing
    from public.friendships
    where (requester_id = me    and recipient_id = other)
       or (requester_id = other and recipient_id = me)
    limit 1;
    if existing.status = 'accepted' then
      raise exception 'already friends';
    elsif existing.requester_id = me then
      raise exception 'request already sent';
    else
      raise exception 'pending request from this user';
    end if;
  end;

  return new_id;
end $$;

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.friendships enable row level security;

-- See only rows you're part of (both pending and accepted).
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships for select
  to authenticated
  using (auth.uid() in (requester_id, recipient_id));

-- Only the requester can create a row, and only as a pending request.
drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships for insert
  to authenticated
  with check (
    requester_id = auth.uid()
    and status = 'pending'
    and requester_id <> recipient_id
  );

-- Only the recipient can transition pending → accepted.
drop policy if exists friendships_update_accept on public.friendships;
create policy friendships_update_accept on public.friendships for update
  to authenticated
  using (recipient_id = auth.uid() and status = 'pending')
  with check (recipient_id = auth.uid() and status = 'accepted');

-- Either side can delete: unfriend, cancel outgoing request, decline incoming request.
drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships for delete
  to authenticated
  using (auth.uid() in (requester_id, recipient_id));

-- ─── friends-only leaderboard view ────────────────────────────────────────
-- Rewrites the view from 0003. Shape is identical to the prior version so
-- `fetchLeaderboard` in lib/social/leaderboard.ts keeps working unchanged —
-- it just returns fewer rows (self + accepted friends).
drop view if exists public.leaderboard_week;
create view public.leaderboard_week
  with (security_invoker = on) as
  select
    p.id            as user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.profile_color,
    coalesce(ws.workouts_count, 0)   as workouts_count,
    coalesce(ws.volume_lbs, 0)       as volume_lbs,
    coalesce(ws.duration_seconds, 0) as duration_seconds,
    ws.week_start
  from public.profiles p
  left join public.weekly_stats ws
    on ws.user_id = p.id
   and ws.week_start = (date_trunc('week', (now() at time zone 'utc'))::date)
  where p.id = auth.uid()
     or public.are_friends(p.id, auth.uid());

-- ─── realtime ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.friendships;
