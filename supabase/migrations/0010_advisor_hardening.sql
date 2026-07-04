-- 0010: pre-launch security-advisor hardening
--
-- Advisors flagged every SECURITY DEFINER function as executable by `anon`
-- (and `authenticated`) via the REST RPC surface. Locking down:
--
-- - Trigger-only functions lose EXECUTE entirely — trigger firing does not
--   require the DML role to hold EXECUTE, so this is free hardening.
-- - RPCs the app calls (send_friend_request, get_or_create_direct_chat,
--   mark_chat_read, get_unread_chat_counts, set_friend_mute) and helpers
--   referenced by RLS policies (is_chat_member) or callable peers
--   (are_friends) keep EXECUTE for `authenticated` only — anonymous clients
--   have no business calling any of them.
-- - bump_chat_last_message also gets its search_path pinned (same fix as
--   0005_fix_trigger_search_path applied to the newer trigger functions).

alter function public.bump_chat_last_message() set search_path = public;

-- Trigger-only: no RPC surface at all
revoke execute on function public.bump_chat_last_message() from public, anon, authenticated;
revoke execute on function public.cleanup_empty_chat() from public, anon, authenticated;

-- Signed-in-only RPCs and policy helpers
revoke execute on function public.are_friends(uuid, uuid) from public, anon, authenticated;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

revoke execute on function public.is_chat_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.is_chat_member(uuid, uuid) to authenticated;

revoke execute on function public.get_or_create_direct_chat(text) from public, anon, authenticated;
grant execute on function public.get_or_create_direct_chat(text) to authenticated;

revoke execute on function public.get_unread_chat_counts() from public, anon, authenticated;
grant execute on function public.get_unread_chat_counts() to authenticated;

revoke execute on function public.mark_chat_read(uuid) from public, anon, authenticated;
grant execute on function public.mark_chat_read(uuid) to authenticated;

revoke execute on function public.send_friend_request(text) from public, anon, authenticated;
grant execute on function public.send_friend_request(text) to authenticated;

revoke execute on function public.set_friend_mute(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_friend_mute(uuid, boolean) to authenticated;
