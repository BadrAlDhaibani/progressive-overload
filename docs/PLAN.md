# Provolone Implementation Plan

The living roadmap. Shipped work lives in [PLAN.archive.md](PLAN.archive.md). Tactical gotchas accumulate in [LEARNINGS.md](LEARNINGS.md). The full MVP scope, schema, and design tokens are in [SCOPE.md](SCOPE.md), [SCHEMA.md](SCHEMA.md), [DESIGN.md](DESIGN.md).

Workflow: one testable unit per batch, stop for the user to verify and commit. `/review-batch` audits the diff before commit; `/finish-batch` produces the wrap-up.

---

## Status

App is feature-complete for the offline MVP and the optional social tier (Friends, leaderboard, 1:1 chat, push notifications with opt-out UI, account deletion). Currently on TestFlight (S5 done). Analytics tab shipped (Phase 1.12); Rest Timer B1 shipped (Phase 1.13 — B2 Live Activity deferred to v1.1); N2 shipped 2026-04-27 (`d828baf`). Launch queue, in order: **chat-message notifications** → **S6** (privacy policy + store metadata) → **S7** (production build + submission). Full launch gameplan: `~/.claude/plans/what-s-left-for-us-eventual-hellman.md`.

## In progress

- **Chat-message notifications** *(pulled up from Deferred into launch scope 2026-07-04).* Reuses N1 infra (`push_tokens`, `notification_prefs`, Expo push pattern from `notify-workout-start`). Two batches:
  - **2a Backend:** `0009_chat_message_notifications.sql` — enable `pg_net`, `AFTER INSERT` trigger on `messages` POSTing to new `notify-chat-message` edge function (server-side, shared-secret header validated in-function; unlike `notify-workout-start`'s client invoke). Function resolves the other `chat_members` row, filters by recipient `receive_enabled` + per-friend mute, batch-POSTs to Expo with `data: { kind: 'chat_message', chatId }`. No 2h dedup. Scope cut: reuse friend mute, no chat-level mute in v1.
  - **2b Client:** extend `parseNotificationKind` for `chat_message`; foreground handler suppresses alert when the user is already inside that thread; notification tap deep-links to `/chat/[id]` (extend N1 tap-routing in `store/useTabNavStore.ts` / `app/_layout.tsx`).

## Next up

- **S6: App Store preparation.** Host privacy policy via **GitHub Pages** (draft + store-listing copy + review-notes template recoverable via `git show ec1fece:docs/PLAN.md` — update for Analytics/rest timer/chat), App Store Connect metadata, screenshots ×5 (6.7" + 6.1"), App Privacy declaration, demo account for review notes. ~~Fill `eas.json` submit creds~~ — already done (`appleId` / `ascAppId` / `appleTeamId` present).
- **Pre-flight checks (before S7):** confirm Supabase project isn't paused / decide on plan tier (MCP timed out 2026-07-04); verify Apple OAuth ES256 client secret is configured in Supabase Auth and record its rotation date (expires every 6 months; `scripts/apple-client-secret.mjs`); run `mcp__supabase__get_advisors` (security + performance); confirm migrations 0001–0009 applied.
- **S7: Production build & submission.** `EXPO_NO_CAPABILITY_SYNC=1 eas build --profile production --platform ios`, TestFlight smoke test (rest timer, chat push, Apple sign-in, airplane-mode logging), then `eas submit --platform ios --latest`. `app.json` name/version/bundle id already correct; `autoIncrement: true` handles buildNumber.

## Backlog

- **WI-D-stop-hook**: optional Stop-hook in `.claude/settings.json` that auto-runs `/capture-pattern` review at end-of-session for a self-improving loop. Deferred from WI-D — the manual + autonomous skill alone is probably enough; revisit if learnings stop accumulating.
- **N1 post-launch follow-ups** (one bundled batch once real traffic flows):
  - Prune `push_tokens` on `DeviceNotRegistered` Expo tickets (`notify-workout-start/index.ts:180-186`).
  - Clear orphan `push_tokens` on app launch — `lib/notifications.ts:19` `currentToken` module state misses force-quit + sign-out edge case.
  - Daily `pg_cron` to prune `notifications_sent` older than 7 days.
  - Android notification icon: white-on-transparent monochrome — only when an Android build is on the table.
  - Drop the `shouldShowAlert: true` back-compat key in `setNotificationHandler` (`lib/notifications.ts:15`) once TS flags it.
- **Avatar upload flow.** `profiles.avatar_url` exists in schema but display-only. Needs picker + Storage bucket + RLS.
- **Apple OAuth signing-secret verification.** Confirm `scripts/apple-client-secret.mjs` is uploaded to Supabase before relying on Apple sign-in in production.
- **Active workout + deleted-exercise FK edge case.** Surfaced in F7. Active workout is `fullScreenModal` so unreachable via normal nav, but worth a defensive guard if the flow ever opens up.

## Deferred (v1.1 — after App Store launch)

- **Rest Timer B2: iOS Live Activity / Dynamic Island.** Lock-screen countdown via `@bacons/expo-apple-targets` config plugin + in-tree Expo native module bridge (~100 lines SwiftUI + ~40 lines bridge Swift). Requires `npx expo prebuild --clean` + EAS dev build. Original plan file is gone from disk — needs a fresh plan when picked up.
- **Chat-level mute.** Per-thread mute on top of the per-friend mute (cut from chat-message notifications v1; let real-world use inform whether it's needed).
