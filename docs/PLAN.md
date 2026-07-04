# Provolone Implementation Plan

The living roadmap. Shipped work lives in [PLAN.archive.md](PLAN.archive.md). Tactical gotchas accumulate in [LEARNINGS.md](LEARNINGS.md). The full MVP scope, schema, and design tokens are in [SCOPE.md](SCOPE.md), [SCHEMA.md](SCHEMA.md), [DESIGN.md](DESIGN.md).

Workflow: one testable unit per batch, stop for the user to verify and commit. `/review-batch` audits the diff before commit; `/finish-batch` produces the wrap-up.

---

## Status

App is feature-complete for the offline MVP and the optional social tier (Friends, leaderboard, 1:1 chat, push notifications with opt-out UI, account deletion). Currently on TestFlight (S5 done). Analytics tab (1.12), Rest Timer B1 (1.13), N2 (`d828baf`), and chat-message notifications (1.14, shipped 2026-07-04) are all live. S6 assets are done: privacy policy + support pages live on GitHub Pages, listing package in `docs/STORE.md`, demo account `applereview` seeded. Remaining: **user-side App Store Connect data entry** (work through `docs/STORE.md`) → **S7** (production build + submission). Full launch gameplan: `~/.claude/plans/what-s-left-for-us-eventual-hellman.md`.

## In progress

- **S6 App Store Connect data entry (user-side).** Work through `docs/STORE.md` top to bottom: metadata fields, description/keywords, screenshots, App Privacy questionnaire, demo credentials (badrdeeb@gmail.com — password NOT in the repo, ASC review-notes field only) + review notes.

## Next up

- **Remaining pre-flight (user dashboard actions):**
  - Enable leaked-password protection: Dashboard → Authentication → Passwords (advisor WARN, 2026-07-04).
  - **Decide Supabase tier before launch.** Free tier pauses after ~1 week of inactivity (it was INACTIVE on 2026-07-04 and had to be manually restored — that's a production outage for the social layer). Pro ($25/mo) removes pausing.
  - Test Sign in with Apple on the TestFlight build — provider is enabled (authorize endpoint verified 2026-07-04) but the client secret is only exercised at token exchange. **Secret expires ~2026-10-21** (6 months from 2026-04-21 setup); regenerate via `scripts/apple-client-secret.mjs` + paste into Dashboard → Auth → Providers → Apple, and set a reminder to rotate before expiry.
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
