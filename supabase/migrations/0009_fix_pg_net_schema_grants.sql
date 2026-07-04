-- 0009 follow-up: security-advisor fixes for chat-message notifications
--
-- 1. `create extension pg_net` (no schema) registered the extension in
--    `public` — advisors want it in `extensions`. Its callable functions live
--    in the `net` schema either way; dropping/recreating is safe because the
--    trigger function resolves net.http_post at runtime, not via a DDL
--    dependency.
-- 2. The trigger function should not be callable through the REST RPC
--    surface (it's SECURITY DEFINER and only Postgres should run it).

drop extension if exists pg_net;
create extension pg_net with schema extensions;

revoke execute on function public.notify_chat_message() from public, anon, authenticated;
