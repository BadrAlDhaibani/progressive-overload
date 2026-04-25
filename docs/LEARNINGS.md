# Provolone Learnings

Append-only one-liners for tactical gotchas, edge cases, and non-obvious decisions that have already burned us. Distinct from `CLAUDE.md` (policy / conventions) and [PLAN.md](PLAN.md) (roadmap).

Add new entries via `/capture-pattern` (the skill picks the right section, dedupes against existing entries, and appends in the standard format).

---

## Database

- **expo-sqlite SDK 52+ is synchronous.** `runSync` / `getAllSync` / `getFirstSync` return directly — never `await` them. The old callback-based `db.transaction()` is deprecated.
- **Sets must order by `set_order`, never `id` or `created_at`.** Users delete and re-add sets, so auto-increment IDs lie about insertion order.
- **`getLastPerformance` excludes the current in-progress workout.** Otherwise the user's incomplete in-flight data becomes its own reference.
- **Cascade deletion lives in app-level transactions, not schema.** SQLite can't add `ON DELETE CASCADE` to existing FKs without recreating tables. See `deleteExercise` in `db/exercises.ts` — wraps `BEGIN`/`COMMIT`/`ROLLBACK`, captures affected rows up-front, removes empty parents at the end.
- **Schema migrations are gated by `user_version` PRAGMA.** Bump it in `db/database.ts`, run the new `ALTER TABLE` once. Don't put unconditional inserts in `db/seed.ts` — it would re-seed on every launch.
- **Local IDs for sets, DB IDs assigned on persist.** Zustand uses string IDs (counter); SQLite assigns real IDs only on completion/finish. Avoids a DB round-trip per empty set added.

## SetRow / inputs

- **Use `onEndEditing`, not `onChangeText`.** Per-keystroke setState in numeric inputs caused stutter and erroneous DB writes. Local string state mirrors the input; commit on blur via `onEndEditing`.
- **Flush pending text on complete tap.** Otherwise the value typed while the input still has focus loses to the previously committed value (race condition).
- **`editable={!isComplete}`.** Completed sets lock until uncompleted, prevents accidental edits on a "done" row.
- **Write to SQLite on set complete and on workout finish — not on every keystroke.** `useWorkoutStore` is the source of truth during a session; SQLite is a snapshot on completion.

## Animations

- **Reanimated v3 only.** Legacy `Animated` from `react-native` runs bookkeeping on the JS thread and feels visibly choppier next to Reanimated views. Don't mix.
- **Always wrap pressables in `AnimatedPressable`.** Hand-rolling a 0.97 scale animation in each component duplicates worklet code and drifts from the standard. Defaults are 0.97 / 100ms / 150ms release.
- **iOS `overflow: 'hidden'` kills shadows.** Wrap the shadowed surface in an outer View that owns the shadow; keep `overflow: hidden` on the inner View.
- **Track `previous isComplete` with `useRef`** in animation triggers, otherwise the animation runs on mount instead of only on the false→true transition.

## Navigation

- **Active workout is `presentation: 'fullScreenModal'`.** Prevents accidental swipe-away mid-workout. Don't downgrade to `'modal'`.
- **Workout summary uses `gestureEnabled: false`.** Otherwise iOS swipe-back returns to the now-empty workout screen.
- **Modal initial route needs `unstable_settings`** in the parent layout, or back gestures break in subtle ways.

## Fonts

- **On Android, `fontWeight` is ignored when `fontFamily` is set.** Replace `fontWeight: '600'` with `fontFamily: fonts.semiBold` (and friends) and remove the weight. `TextInput` also needs `fontFamily` for typed text to render in Inter.

## Supabase / social

- **Edge functions run with `verify_jwt = false`** because the project uses ES256 (asymmetric) JWTs, which the Supabase gateway can't pre-verify. Functions must call `admin.auth.getUser(jwt)` themselves to validate the bearer token.
- **`syncWeeklyStats` is fire-and-forget.** It's the only sync hook from workout → Supabase and must not block the offline core flow. Same shape: `useWorkoutStore.completeSet` → `notify-workout-start` invoke.
- **Apple `appleid.apple.com/auth/revoke` is best-effort.** If it 5xx's during account deletion, we still delete the Supabase user. Trade-off: Apple may keep the app's permission until the user revokes manually at appleid.apple.com. Documented in the privacy policy.
- **Migration 0005's INFO advisor for `notifications_sent` is intentional.** RLS enabled, zero policies — service-role-only dedup table by design.
- **Trigger functions need `set search_path = public`.** Migration `0005_fix_trigger_search_path` exists because the original trigger functions didn't pin it; advisor flagged the warning.
- **`notifications_sent` only marks dedup on successful Expo tickets.** Failed sends remain eligible for retry on the next workout.

## EAS / TestFlight / build

- **Bump `buildNumber` for every prod rebuild.** Apple rejects re-uploads with the same number.
- **Use `EXPO_NO_CAPABILITY_SYNC=1 eas build` on production.** Without it EAS tries to disable Sign in with Apple on the App ID, which Apple rejects once real users have signed in via SIWA.
- **`EXPO_PUBLIC_SUPABASE_*` belongs in `.env`, not `app.json`.** The env-var prefix matters — only `EXPO_PUBLIC_*` is exposed to the client bundle. Keys in `app.json` would commit to git.
- **APNs Auth Key (.p8) on Expo: enable Sandbox & Production, Team Scoped.** Keep it separate from the Sign in with Apple key for independent revocation.

## Testing

- **Tests live in `<dir>/__tests__/*.test.ts` colocated next to the source they exercise.** See `lib/social/__tests__/` and `utils/__tests__/`. Don't create a top-level `test/` or `__tests__/` directory.
- **Pure-function modules are the test targets; SQLite (`db/`) and Supabase I/O paths are intentionally not covered.** The jest config uses `testEnvironment: 'node'` with the `ts-jest` preset — there's no React Native transform, no expo-sqlite mock, no Supabase test harness. Adding component or DB tests means upgrading the preset (likely `jest-expo`) first.
- **CI runs `npm test` + `npx tsc --noEmit` on push/PR to `main`.** See `.github/workflows/test.yml`. New code must keep both green; a failing type-check blocks merge even if jest passes.
