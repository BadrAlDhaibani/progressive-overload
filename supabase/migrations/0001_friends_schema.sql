-- Provolone — Friends, Leaderboard, Chats
-- Run this in the Supabase SQL editor once.

-- ─── extensions ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── profiles ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null check (char_length(username) between 3 and 24
                                            and username ~ '^[a-z0-9_]+$'),
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists profiles_username_idx on public.profiles (lower(username));

-- ─── weekly stats (leaderboard source) ─────────────────────────────────────
create table if not exists public.weekly_stats (
  user_id             uuid not null references public.profiles(id) on delete cascade,
  week_start          date not null,                    -- ISO week, Monday
  workouts_count      int not null default 0,
  volume_lbs          numeric(12,2) not null default 0,
  duration_seconds    int not null default 0,
  updated_at          timestamptz not null default now(),
  primary key (user_id, week_start)
);
create index if not exists weekly_stats_week_idx on public.weekly_stats (week_start);

-- ─── chats ─────────────────────────────────────────────────────────────────
create table if not exists public.chats (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  last_message_at   timestamptz not null default now()
);

create table if not exists public.chat_members (
  chat_id    uuid not null references public.chats(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (chat_id, user_id)
);
create index if not exists chat_members_user_idx on public.chat_members (user_id);

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null references public.chats(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists messages_chat_idx on public.messages (chat_id, created_at desc);

-- ─── triggers: bump chats.last_message_at on new message ───────────────────
create or replace function public.bump_chat_last_message()
returns trigger language plpgsql security definer as $$
begin
  update public.chats set last_message_at = new.created_at where id = new.chat_id;
  return new;
end $$;

drop trigger if exists bump_chat_last_message_trg on public.messages;
create trigger bump_chat_last_message_trg
after insert on public.messages
for each row execute function public.bump_chat_last_message();

-- ─── helper: find or create a 1:1 chat by username ─────────────────────────
create or replace function public.get_or_create_direct_chat(target_username text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me        uuid := auth.uid();
  other     uuid;
  existing  uuid;
  new_chat  uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select id into other from public.profiles where lower(username) = lower(target_username);
  if other is null then raise exception 'user not found'; end if;
  if other = me then raise exception 'cannot chat with yourself'; end if;

  -- existing 2-person chat containing exactly these two users
  select c.id into existing
  from public.chats c
  join public.chat_members cm on cm.chat_id = c.id
  group by c.id
  having count(*) = 2
     and bool_or(cm.user_id = me)
     and bool_or(cm.user_id = other)
  limit 1;

  if existing is not null then return existing; end if;

  insert into public.chats default values returning id into new_chat;
  insert into public.chat_members (chat_id, user_id) values (new_chat, me), (new_chat, other);
  return new_chat;
end $$;

-- ─── leaderboard view (weekly, all users) ──────────────────────────────────
create or replace view public.leaderboard_week as
  select
    p.id           as user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    coalesce(ws.workouts_count, 0)   as workouts_count,
    coalesce(ws.volume_lbs, 0)       as volume_lbs,
    coalesce(ws.duration_seconds, 0) as duration_seconds,
    ws.week_start
  from public.profiles p
  left join public.weekly_stats ws
    on ws.user_id = p.id
   and ws.week_start = (date_trunc('week', (now() at time zone 'utc'))::date);

-- ─── RLS helper: membership check that bypasses RLS to avoid recursion ────
create or replace function public.is_chat_member(_chat_id uuid, _user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.chat_members
    where chat_id = _chat_id and user_id = _user_id
  );
$$;

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.weekly_stats   enable row level security;
alter table public.chats          enable row level security;
alter table public.chat_members   enable row level security;
alter table public.messages       enable row level security;

-- profiles: readable by all signed-in users, writable only by owner
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  to authenticated using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  to authenticated with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- weekly_stats: readable by all signed-in, writable only by owner
drop policy if exists weekly_stats_select on public.weekly_stats;
create policy weekly_stats_select on public.weekly_stats for select
  to authenticated using (true);

drop policy if exists weekly_stats_upsert on public.weekly_stats;
create policy weekly_stats_upsert on public.weekly_stats for insert
  to authenticated with check (user_id = auth.uid());

drop policy if exists weekly_stats_update on public.weekly_stats;
create policy weekly_stats_update on public.weekly_stats for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- chats: members can read and update their chats; insert via RPC only
drop policy if exists chats_select on public.chats;
create policy chats_select on public.chats for select
  to authenticated using (public.is_chat_member(chats.id, auth.uid()));

-- chat_members: members can see rows belonging to their chats
drop policy if exists chat_members_select on public.chat_members;
create policy chat_members_select on public.chat_members for select
  to authenticated using (public.is_chat_member(chat_members.chat_id, auth.uid()));

-- messages: only chat members can read or post
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
  to authenticated using (public.is_chat_member(messages.chat_id, auth.uid()));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert
  to authenticated with check (
    sender_id = auth.uid()
    and public.is_chat_member(messages.chat_id, auth.uid())
  );

-- ─── realtime ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chats;
