-- Provolone — Per-friend mute toggle RPC
-- Run this in the Supabase SQL editor once.
--
-- The mute_by_requester / mute_by_recipient columns were added in 0005, but
-- 0004's only UPDATE policy on friendships (friendships_update_accept) lets
-- the recipient flip pending → accepted and nothing else. There is no policy
-- that lets either side toggle their own mute column directly.
--
-- Rather than add a column-aware RLS policy (Postgres can't restrict UPDATE
-- to specific columns inside a single policy), expose a security-definer RPC
-- that resolves the caller's role on the row and writes the right column.
-- Mirrors the send_friend_request RPC pattern from 0004.

create or replace function public.set_friend_mute(friendship_id uuid, muted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me   uuid := auth.uid();
  row_ record;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select id, requester_id, recipient_id, status into row_
  from public.friendships
  where id = friendship_id;

  if row_.id is null then raise exception 'friendship not found'; end if;
  if row_.status <> 'accepted' then raise exception 'not friends'; end if;

  if row_.requester_id = me then
    update public.friendships set mute_by_requester = muted where id = friendship_id;
  elsif row_.recipient_id = me then
    update public.friendships set mute_by_recipient = muted where id = friendship_id;
  else
    raise exception 'not a participant';
  end if;
end $$;
