# Provolone Implementation Plan — Archive

Historical record of every shipped batch, by phase. The living roadmap is in [PLAN.md](PLAN.md); tactical gotchas accumulate in [LEARNINGS.md](LEARNINGS.md). For exact diffs, see `git log` — this is one-line context per batch.

---

## Phase 1 — MVP (offline-first core)

- **B1** — Design tokens + 3-tab navigation shell. Replaced scaffold (`EditScreenInfo`, `Themed`, `useColorScheme`, `app/modal.tsx`, etc.) with rose-accent layout. `constants/colors.ts`, `constants/muscleGroups.ts`.
- **B2** — Database layer + seed data. SQLite schema, indexes, ~65 seed exercises, 5 templates. `db/database.ts` (gated by `user_version` PRAGMA), `db/seed.ts`, `db/exercises.ts`, `db/workouts.ts`, `db/templates.ts`.
- **Bugfix** — Tab bar icon jitter on tap + swipe delay (PagerView scroll/select handling).
- **Bugfix** — Circular dependency between `db/database.ts` and `db/seed.ts`.
- **B3** — Exercise library screen. Search, muscle-group filter chips, custom-exercise insert. `components/ExerciseListItem.tsx`.
- **B4** — Zustand store + start-workout flow. Local IDs for sets, write to SQLite on complete/finish only. `store/useWorkoutStore.ts`, `app/workout/[id].tsx` as full-screen modal with `KeyboardAvoidingView`.
- **Bugfix** — Safe-area handling: removed nav headers, wrapped tabs in `SafeAreaView` for notch/home indicator.
- **B5** — Add exercise to workout. `components/ExerciseCard.tsx` (memo + `useShallow`), `app/workout/add-exercise.tsx` picker. 1-set default (not 3 as originally planned).
- **B6 (CRITICAL)** — `SetRow` + set logging. `onEndEditing` commit (not `onChangeText`), 56×56 complete button, haptic on tap, `primaryLight` row tint, numeric keyboard.
- **B7** — Last performance display + set/exercise management. `getLastPerformance` query (excludes current in-progress workout), swipe-to-delete sets, long-press exercise to remove. `utils/formatLastPerformance.ts`, `addSetWithValues` and `removeExercise` actions.
- **B8** — Finish workout + summary + Home recent. `app/workout/summary.tsx`, Android `BackHandler`, `useFocusEffect` refresh on Home. Discard skips summary.
- **B9** — History screen + detail. `SectionList` grouped by month. Summary screen reused as detail via `from=history` param.
- **B10a** — Start workout from templates. Horizontal carousel on Home, pre-fills sets from last performance or `default_sets × default_reps` fallback.
- **B10b** — Template CRUD. Create/edit/delete custom templates. `replaceTemplateExercises` wrapped in `BEGIN`/`COMMIT`/`ROLLBACK`. `store/useTemplateFormStore.ts`, `app/template/edit.tsx`, `app/template/pick-exercise.tsx`.
- **B11** — Polish. Replaced 9 hardcoded `#ffffff` with `colors.textOnPrimary`. `RefreshControl` on Home/History/Exercises. `hitSlop` 4→8 on SetRow checkbox.

### Phase 1 polish (P1–P8)

- **P1** — Inter font loading. `@expo-google-fonts/inter`, `constants/typography.ts`.
- **P2** — Apply Inter across all components. Replaced `fontWeight` with matching `fontFamily` entry (Android ignores `fontWeight` when `fontFamily` is set). 12 files.
- **P3** — Muscle-group badge colors. `constants/muscleGroupColors.ts`, applied to chips and labels.
- **P4** — Card shadows & depth. `constants/shadows.ts` platform-aware (iOS shadows, Android elevation).
- **P5** — Screen fade-in animations. `components/AnimatedScreen.tsx` with Reanimated `FadeIn.duration(300)`.
- **P6** — Button press scale animation. `components/AnimatedPressable.tsx` (0.97 / 100ms / 150ms release). Now the project standard for any pressable.
- **P7** — Set completion bounce. Checkmark pop on complete, `editable={!isComplete}` to lock inputs on completed sets.
- **P8** — Gradient start-workout button. `LinearGradient` `primaryMedium → primary` wrapped in `AnimatedPressable`.

---

## Phase 1.5 — Post-testing feature additions

After TestFlight (S5) feedback.

- **F1** — Floating blurred elapsed timer. `expo-blur` `BlurView`, persists during scroll, `pointerEvents="none"`.
- **F2** — Long-press pulse on exercise cards. 1.0 → 1.02 scale during 400ms long-press window, springs back on early release.
- **F3** — Custom exercise creation mid-workout. Extracted `components/AddExerciseModal.tsx`, accessible from `add-exercise` picker. Reuses `insertCustomExercise`.
- **F4** — Assisted weight input. `is_assisted` column on `exercises` (migration via `user_version`). "Assisted lbs" label in SetRow, summary indicator.
- **F5** — Workout UX. Full-swipe to delete sets (`onSwipeableOpen` + `overshootRight`), smart finish warning (skip Alert if all sets complete).
- **F6** — Exercise history & progression screen. `app/exercise/[id].tsx`, `getExerciseHistory` query, `SectionList` grouped by date with green/red/gray progression arrows.

---

## Phase 2 — Testing & App Store submission (S1–S5 done, S6/S7 in PLAN.md)

- **S1** — App identity, config & dark-mode shadows. Bundle id `app.provolone`, `name: "Provolone"`, `cardShadow(colors)` theme-aware (returns empty in dark mode), `eas.json` scaffold, `expo-dev-client` installed.
- **S2** — App icon & splash. White barbell on rose `#f43f5e`. Generated programmatically via temporary `sharp` script (script + dependency removed after generation).
- **S3** — EAS Build setup. `eas-cli`, `eas login`, `eas build:configure`. Verified via `eas whoami` / `eas config`.
- **S4** — Development build (physical device). First dev-client build via `eas device:create` + `eas build --profile development`. Verified expo-sqlite, haptics, Reanimated all native.
- **S5** — TestFlight beta. Production-signed build, `eas submit --platform ios --latest`, smoke-tested as "real user" via TestFlight install.

---

## Phase 1.6 — Pre-publish feature additions

- **F7** — Delete exercises from library. Cascade strategy in app-level transaction (SQLite can't add `ON DELETE CASCADE` to existing FKs without table recreation). `deleteExercise(id)` wraps `BEGIN`/`COMMIT`/`ROLLBACK`, captures affected workout/template ids first, removes empty workouts/templates after. Long-press confirmation with accurate counts via `getExerciseUsage`.

---

## Phase 1.7 — Social layer (PR #1, merged 710d2be on 2026-04-21)

Collaborator-authored PR adding the opt-in Supabase-backed social tier. App remains fully usable signed out.

- **Infrastructure** — `lib/supabase.ts` reads `EXPO_PUBLIC_SUPABASE_*` from `.env` (gitignored). `supabase/migrations/0001_friends_schema.sql`: `profiles`, `weekly_stats`, `chats`, `chat_members`, `messages` — RLS on every table. `store/useAuthStore.ts`, `lib/social/*` for data access.
- **UI** — 4th Friends tab with `SegmentedControl` (Leaderboard ⇄ Chats). `SignInPanel` (Apple OAuth + email/password with confirm-password). Realtime 1:1 chat (`app/chat/[id].tsx`). Settings → username (`app/settings/username.tsx`). Add Friends chooser with share-link card.
- **Pre-merge review batches** — `63838a3` moved Supabase creds to env + raw `Pressable` → `AnimatedPressable`; `0812aac` `SafeAreaProvider` + chat bottom-edge + spinner split; `9a47c5d` confirm-password + keyboard dismissal + `SegmentedControl` strict-mode fix; `2108cc2` Add Friends chooser with share-link.
- **Known gaps at merge** — no in-app account deletion (D1 follows), no avatar upload despite schema column, Apple OAuth signing secret to verify in S6/S7.

---

## Phase 1.8 — Pre-submission requirements (Apple 5.1.1(v) blocker)

- **D1a** — Account deletion backend. `0002_delete_account.sql` adds `cleanup_empty_chat()` trigger (`security definer`, `set search_path = public`) that drops 1:1 chats when the last member leaves. Edge function `supabase/functions/delete-account/index.ts` (Deno) verifies caller JWT, optionally revokes Apple refresh token via `appleid.apple.com/auth/revoke`, then `admin.auth.admin.deleteUser(userId)` — schema cascade handles the rest.
- **D1b** — Account deletion client wiring + deploy (commit `f4b039e`). `useAuthStore.deleteAccount()`, Delete button in `settings/username.tsx` (single destructive Alert per Apple guidance). Edge fn deployed with `verify_jwt: false` because project uses ES256 (asymmetric) JWTs the gateway can't pre-verify.

---

## Phase 1.9 — Social layer polish

- **P1** — User-pickable profile color (commit `9a15f32`). `0003_profile_color.sql` adds nullable `profile_color text` with hex regex check. `AVATAR_PALETTE` (7 swatches) in `constants/colors.ts`. `avatarColorFor(seed, color)` helper picks user choice or seed-hashed fallback. Picker in `settings/username.tsx`. `leaderboard_week` view recreated to include the column.

---

## Phase 1.10 — Mutual-accept friendships + friends-only leaderboard (commit `79c22be`)

Prereq for push notifications. Defines a formal friend graph; previously had only public `weekly_stats` and 1:1 `chats`.

- **F1** — Friendships backend + add-friend modal. `0004_friendships.sql`: single-row-per-pair table, expression-based unique pair index, RLS (insert = requester, update pending→accepted = recipient, delete = either side), `are_friends(a,b)` SECURITY DEFINER helper, `send_friend_request(target_username)` RPC with atomic lookup+dedup+insert. `leaderboard_week` rewritten with `security_invoker = on` and friendship `EXISTS` clause. `lib/social/friends.ts` mirrors `chats.ts` patterns. `app/friends/new.tsx` username-lookup modal.
- **F2** — Friends-centric second segment + modal consolidation. Second segment renamed Chats → Friends. `components/friends/FriendsListView.tsx` (search input, incoming-request banner with realtime via `subscribeToFriendships`, friend rows). `FriendRow` (tap → `startDirectChat`, long-press → remove). Deleted `app/chat/new.tsx`, `ChatsView.tsx`, `ChatListItem.tsx`, `listChats`. Share card link updated to `provolone://friends/new?u=…`.

Decline = hard delete (re-requestable). Forward-compat: friendships table can absorb `notifications_muted` later without disruption.

---

## Phase 1.11 — Friend push notifications (N2 pending — see PLAN.md)

- **N1** — End-to-end push plumbing (commit `15a27d2`, deployed via Supabase MCP 2026-04-24).
  - `0005_push_notifications.sql`: `push_tokens` (pk `expo_token`, RLS by `user_id`), `notification_prefs` (lazy-created), `notifications_sent` (service-role-only dedup table — its INFO advisor for "RLS enabled, no policies" is intentional), `friendships.mute_by_requester` + `mute_by_recipient` columns. Plus a `0005_fix_trigger_search_path` follow-up to pin `search_path = public` on the new trigger functions.
  - `notify-workout-start` Deno edge function: verify JWT, skip if actor `send_enabled = false`, drop muted/disabled recipients, drop 2h-deduped pairs, batch-POST to `exp.host/--/api/v2/push/send`, write `notifications_sent` only for successful tickets. `verify_jwt = false` (ES256, validated in-function).
  - Client: `lib/notifications.ts` (registration with permission prompt + token upsert into `push_tokens`), `store/useTabNavStore.ts` for tap-routing, `useWorkoutStore.completeSet` first-completion guard fires `functions.invoke('notify-workout-start')` (guarded on `isSupabaseConfigured` + signed-in, so offline/signed-out core untouched). `useAuthStore.signOut` awaits `unregisterPushToken` before signing out so RLS still authorizes the delete.
  - Tap routing: `Notifications.getLastNotificationResponseAsync` (cold) + `addNotificationResponseReceivedListener` (warm) → `requestTab('friends', 'leaderboard')`.
  - APNs: Auth Key uploaded to Expo, **Sandbox & Production**, Team Scoped. Separate from the Sign in with Apple key.
  - Mute semantics: one-way per side. Two boolean columns on `friendships`; A's pushes skip B iff B-side mute is true.
  - **Build flag**: `EXPO_NO_CAPABILITY_SYNC=1 eas build` — without it EAS tries to disable Sign in with Apple on the App ID, which Apple rejects once real users have signed in via SIWA.

---

## Workflow improvements (WI)

Internal tooling overhaul, no app behavior change.

- **WI-A** — `/review-batch` and `/finish-batch` project skills. `.claude/skills/review-batch/SKILL.md` validates the diff against CLAUDE.md conventions; `.claude/skills/finish-batch/SKILL.md` produces test plan + commit message + PLAN.md update. Both `disable-model-invocation: true` so Claude won't auto-run them.
- **WI-B** — PLAN.md / PLAN.archive.md / LEARNINGS.md split (commit `1857246`). Slim living roadmap with In progress / Next up / Backlog / Deferred sections; archive holds the per-batch history; LEARNINGS.md holds tactical one-liners.
- **WI-C** — Jest + ts-jest test infra and GitHub Actions CI. Tests cover pure helpers in `lib/social/{username,week}` and `utils/formatLastPerformance`. CI runs `npm test` + `npx tsc --noEmit` on push/PR to `main`. Component / SQLite / Supabase paths intentionally not yet covered — the `node` test environment + `ts-jest` preset would need upgrading to `jest-expo` first.
- **WI-D** — `/capture-pattern` skill. Appends one-line learnings to `docs/LEARNINGS.md` under the right section, with dedupe + autonomous-mode confirmation guardrail. `disable-model-invocation` left unset so Claude can invoke it on its own when a genuinely non-obvious gotcha surfaces. Stop-hook auto-trigger deferred to backlog.
