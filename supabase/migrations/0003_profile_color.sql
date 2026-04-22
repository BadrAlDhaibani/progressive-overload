-- Provolone — User-pickable profile color
-- Run this in the Supabase SQL editor once.
--
-- Adds a nullable profile_color hex on profiles. NULL means "use the
-- client-side hash-derived default." The leaderboard view is recreated to
-- include the new column so leaderboard rows can render the user's choice.

alter table public.profiles
  add column if not exists profile_color text
  check (profile_color is null or profile_color ~ '^#[0-9a-fA-F]{6}$');

drop view if exists public.leaderboard_week;
create view public.leaderboard_week as
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
   and ws.week_start = (date_trunc('week', (now() at time zone 'utc'))::date);
