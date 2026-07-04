-- 0009: chat-message push notifications
--
-- Server-side fan-out: an AFTER INSERT trigger on public.messages POSTs the
-- new row to the `notify-chat-message` edge function via pg_net. Server-side
-- (unlike notify-workout-start's client invoke) so delivery does not depend
-- on the sender's app staying alive after send.
--
-- The trigger reads two Vault secrets (NOT created by this migration — they
-- hold real values and are inserted once, out of band):
--
--   select vault.create_secret('<https://PROJECT.supabase.co/functions/v1/notify-chat-message>', 'chat_notify_url');
--   select vault.create_secret('<random shared secret>', 'chat_notify_secret');
--
-- The same shared secret must be set on the edge function:
--   npx supabase secrets set CHAT_NOTIFY_SECRET=<random shared secret>
--
-- If either secret is missing the trigger is a no-op, so this migration is
-- safe to apply before the function is deployed.

create extension if not exists pg_net;

create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text;
  fn_secret text;
begin
  select decrypted_secret into fn_url
    from vault.decrypted_secrets where name = 'chat_notify_url';
  select decrypted_secret into fn_secret
    from vault.decrypted_secrets where name = 'chat_notify_secret';
  if fn_url is null or fn_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := fn_url,
    body := jsonb_build_object(
      'message_id', new.id,
      'chat_id', new.chat_id,
      'sender_id', new.sender_id,
      'body', new.body
    ),
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-chat-notify-secret', fn_secret
    ),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  -- Notification plumbing must never block a message insert.
  return new;
end $$;

drop trigger if exists notify_chat_message_trg on public.messages;
create trigger notify_chat_message_trg
after insert on public.messages
for each row execute function public.notify_chat_message();
