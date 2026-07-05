-- 0011: performance-advisor fixes
--
-- 1. Every RLS policy called auth.uid() bare, which Postgres re-evaluates per
--    row. Wrapping it in (select auth.uid()) makes it an InitPlan evaluated
--    once per query (advisor lint 0003_auth_rls_initplan). Expressions are
--    otherwise identical to the originals.
-- 2. Covering indexes for two unindexed FKs (advisor lint
--    0001_unindexed_foreign_keys) — both matter for profile-deletion cascades.

-- chats / chat_members / messages
alter policy chats_select on public.chats
  using (is_chat_member(id, (select auth.uid())));
alter policy chat_members_select on public.chat_members
  using (is_chat_member(chat_id, (select auth.uid())));
alter policy messages_select on public.messages
  using (is_chat_member(chat_id, (select auth.uid())));
alter policy messages_insert on public.messages
  with check ((sender_id = (select auth.uid())) and is_chat_member(chat_id, (select auth.uid())));

-- friendships
alter policy friendships_select on public.friendships
  using (((select auth.uid()) = requester_id) or ((select auth.uid()) = recipient_id));
alter policy friendships_insert on public.friendships
  with check ((requester_id = (select auth.uid())) and (status = 'pending') and (requester_id <> recipient_id));
alter policy friendships_update_accept on public.friendships
  using ((recipient_id = (select auth.uid())) and (status = 'pending'))
  with check ((recipient_id = (select auth.uid())) and (status = 'accepted'));
alter policy friendships_delete on public.friendships
  using (((select auth.uid()) = requester_id) or ((select auth.uid()) = recipient_id));

-- profiles
alter policy profiles_insert on public.profiles
  with check (id = (select auth.uid()));
alter policy profiles_update on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- weekly_stats
alter policy weekly_stats_upsert on public.weekly_stats
  with check (user_id = (select auth.uid()));
alter policy weekly_stats_update on public.weekly_stats
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- push_tokens
alter policy push_tokens_select on public.push_tokens
  using (user_id = (select auth.uid()));
alter policy push_tokens_insert on public.push_tokens
  with check (user_id = (select auth.uid()));
alter policy push_tokens_update on public.push_tokens
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy push_tokens_delete on public.push_tokens
  using (user_id = (select auth.uid()));

-- notification_prefs
alter policy notification_prefs_select on public.notification_prefs
  using (user_id = (select auth.uid()));
alter policy notification_prefs_insert on public.notification_prefs
  with check (user_id = (select auth.uid()));
alter policy notification_prefs_update on public.notification_prefs
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- FK covering indexes
create index if not exists messages_sender_idx on public.messages (sender_id);
create index if not exists notifications_sent_recipient_idx on public.notifications_sent (recipient_id);
