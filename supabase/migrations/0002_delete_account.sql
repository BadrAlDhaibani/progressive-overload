-- Provolone — Account deletion support
-- Run this in the Supabase SQL editor once.
--
-- Adds a trigger that removes a chats row once its last chat_members row is
-- deleted. This keeps 1:1 chats from orphaning when one party deletes their
-- account (the cascade from auth.users → profiles → chat_members fires this
-- trigger for each member row, and the last one clears the chat).

create or replace function public.cleanup_empty_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.chat_members where chat_id = old.chat_id
  ) then
    delete from public.chats where id = old.chat_id;
  end if;
  return old;
end $$;

drop trigger if exists cleanup_empty_chat_trg on public.chat_members;
create trigger cleanup_empty_chat_trg
after delete on public.chat_members
for each row execute function public.cleanup_empty_chat();
