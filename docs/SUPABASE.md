# Supabase setup

The Friends tab (Leaderboard + Chats + Sign in with Apple) needs a Supabase project. Free tier is fine.

## 1. Create the project

1. Sign in at https://supabase.com → New project.
2. Copy the **Project URL** and **anon public key** from *Project Settings → API*.
3. Create a `.env` file at the repo root (or set shell env vars) with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```
   See `.env.example` for the template. `.env` is gitignored — never commit it.

Share these two values with other engineers out-of-band (password manager, 1Password, etc.); do not put them in `app.json` or any committed file.

## 2. Run the migration

Open the SQL editor in Supabase and paste `supabase/migrations/0001_friends_schema.sql`, then run. It creates:

- `profiles` — one row per user, linked to `auth.users`
- `weekly_stats` — denormalised per-user per-ISO-week aggregates (drives the leaderboard)
- `chats`, `chat_members`, `messages` — group chat (1:1 is just a 2-member group)
- `get_or_create_direct_chat(username)` — RPC used by the "add by username" flow
- `leaderboard_week` view — current-week snapshot, joined to profile info
- RLS policies so authenticated users can only write their own data
- Realtime publication on `messages` + `chats`

## 3. Enable Sign in with Apple

The app uses the **web OAuth flow** (not the native iOS sheet) so it runs in Expo Go without a custom dev client.

*Authentication → Providers → Apple*:

- **Client IDs**: `app.provolone, app.provolone.signin`
- **Secret Key**: a JWT signed with the `.p8`. Regenerate every 6 months:
  ```
  node scripts/apple-client-secret.mjs \
    --team <TEAM_ID> --key <KEY_ID> \
    --services app.provolone.signin --p8 ./AuthKey_<KEY_ID>.p8
  ```

*Authentication → URL Configuration → Redirect URLs* — add these so Supabase allows the app to receive the session:

```
exp://*                  # Expo Go (dev, any IP)
provolone://*            # dev client / production build
http://localhost:*       # web dev
```

The Apple Developer *Services ID* (`app.provolone.signin`) must list the Supabase callback URL:
`https://<project>.supabase.co/auth/v1/callback`

## 4. Realtime

Nothing else to do — the migration adds `messages` and `chats` to the `supabase_realtime` publication.
