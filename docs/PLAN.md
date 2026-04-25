# Provolone Implementation Plan

The living roadmap. Shipped work lives in [PLAN.archive.md](PLAN.archive.md). Tactical gotchas accumulate in [LEARNINGS.md](LEARNINGS.md). The full MVP scope, schema, and design tokens are in [SCOPE.md](SCOPE.md), [SCHEMA.md](SCHEMA.md), [DESIGN.md](DESIGN.md).

Workflow: one testable unit per batch, stop for the user to verify and commit. `/review-batch` audits the diff before commit; `/finish-batch` produces the wrap-up.

---

## Status

App is feature-complete for the offline MVP and the optional social tier (Friends, leaderboard, 1:1 chat, push notifications, account deletion). Currently on TestFlight (S5 done). Two App Store blockers remain: **N2** (push opt-out UI) and **S6/S7** (store metadata + final submission).

## In progress

- **N2: Push-notification opt-out UI.** Backend already in place (`notification_prefs`, `friendships.mute_by_*`). Two global switches (send, receive) in settings + per-friend mute via long-press menu on `FriendRow`. No native code; iterable in dev client. Small batch.

## Next up

- **S6: App Store preparation.** Host privacy policy publicly, fill App Store Connect metadata, screenshots ×5 (6.7" + 6.1"), App Privacy declaration, demo account for review notes, fill `eas.json` with `appleId` / `ascAppId` / `appleTeamId`. Privacy-policy draft + store-listing copy + review-notes template were in the pre-WI-B PLAN.md — retrieve via `git log --diff-filter=D --follow -p -- docs/PLAN.md` or check the commit that introduced WI-B's PLAN.md split.
- **S7: Production build & submission.** `EXPO_NO_CAPABILITY_SYNC=1 eas build --profile production --platform ios && eas submit --platform ios --latest`. Pre-flight checklist: `app.json` `name: "Provolone"`, `version: "1.0.0"`, bundle id set, `userInterfaceStyle`, branded splash + icon. Bump `buildNumber` for every rebuild.

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

## Deferred (separate future phases)

- **Chat-message notifications.** Architecturally distinct from N1: server-side trigger via `pg_net` on `messages` insert, deep-link to `/chat/[id]`, foreground-in-thread suppression instead of 2h dedup, chat-level mute on top of friend mute. Plan after N2 + S7 land and real-world use informs the design. Reuses `notification_prefs` and `push_tokens` from N1.
