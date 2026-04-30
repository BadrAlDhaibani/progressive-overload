-- Provolone — Chat read state (unread indicators)
-- Adds per-member last_read_at on chat_members + RPCs to mark a chat read
-- and to fetch unread counts. Read state is server-side so it syncs across
-- devices (iPhone + iPad on the same account).
--
-- not null default now() backfills existing rows as "fully read", so the
-- migration does not flood every account with old-message badges on rollout.

alter table public.chat_members
  add column if not exists last_read_at timestamptz not null default now();

-- Mark the caller's row in chat_members as read up to now().
-- Security definer because chat_members has no UPDATE policy and we don't
-- want to add a column-aware one (Postgres can't restrict UPDATE to specific
-- columns inside a single policy). Mirrors set_friend_mute in 0006.
create or replace function public.mark_chat_read(_chat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.chat_members
     set last_read_at = now()
   where chat_id = _chat_id and user_id = auth.uid();
end $$;

-- One row per chat the caller is a member of. partner_id is the other
-- member of the chat (1:1 chats only — group chats would emit one row per
-- other member, which the client ignores).
create or replace function public.get_unread_chat_counts()
returns table (chat_id uuid, partner_id uuid, unread_count int)
language sql
security definer
stable
set search_path = public
as $$
  select cm.chat_id,
         other.user_id as partner_id,
         count(m.id)::int as unread_count
  from public.chat_members cm
  join public.chat_members other
    on other.chat_id = cm.chat_id and other.user_id <> cm.user_id
  left join public.messages m
    on m.chat_id = cm.chat_id
   and m.sender_id <> cm.user_id
   and m.created_at > cm.last_read_at
  where cm.user_id = auth.uid()
  group by cm.chat_id, other.user_id;
$$;

grant execute on function public.mark_chat_read(uuid) to authenticated;
grant execute on function public.get_unread_chat_counts() to authenticated;
