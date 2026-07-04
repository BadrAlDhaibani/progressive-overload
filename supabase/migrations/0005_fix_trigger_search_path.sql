-- 0005 follow-up: pin search_path on the push-notification trigger functions.
--
-- (Recovered 2026-07-04 from the remote supabase_migrations.schema_migrations
-- history — this was applied via MCP on 2026-04-24 but the local file was
-- never committed.)

alter function public.touch_push_tokens_updated_at()          set search_path = public;
alter function public.touch_notification_prefs_updated_at()   set search_path = public;
