# Provolone

Gym workout tracker focused on progressive overload. The core loop — **log sets, reps, and weight** so you know what to beat next time — is offline-first and stored locally in SQLite. A social layer (friends, weekly leaderboard, 1:1 chat) is layered on top via Supabase and requires sign-in, but it is strictly optional: the app must remain fully usable without an account.

## Tech Stack

- React Native + Expo (managed workflow, SDK 52+)
- Expo Router (file-based routing)
- expo-sqlite (synchronous API) — local workout data
- Supabase (Postgres + Auth + Realtime) — social features only
- Zustand for state management
- expo-haptics for tactile feedback
- Units: lbs only, no toggle

## Project Structure

```
app/
  (tabs)/
    index.tsx          # Home — start workout, recent sessions
    history.tsx        # Past workouts list
    exercises.tsx      # Exercise library + search
    # Friends tab is rendered inside (tabs)/_layout.tsx via FriendsContent
  workout/
    [id].tsx           # Active workout session (modal)
    summary.tsx        # Post-workout summary
  chat/
    [id].tsx           # 1:1 chat thread
    new.tsx            # "Add by username" modal
  settings/
    username.tsx       # Claim/change username (modal)
components/
  SetRow.tsx           # Weight/reps/complete input row
  ExerciseCard.tsx     # Exercise block with sets inside active workout
  ExerciseListItem.tsx # Row in exercise library
  RestTimer.tsx        # Bottom sheet timer (Tier A nice-to-have)
  SegmentedControl.tsx # Friends tab switcher (Leaderboard / Chats)
  friends/             # Social UI — leaderboard rows, chat list, message input, sign-in panel, etc.
  screens/
    FriendsContent.tsx # Rendered in the Friends tab
db/
  database.ts          # SQLite init, migrations, PRAGMA setup
  exercises.ts         # Exercise CRUD
  workouts.ts          # Workout + set CRUD
  templates.ts         # Template CRUD
  seed.ts              # First-launch seed data (exercises + templates)
lib/
  supabase.ts          # Supabase client (reads EXPO_PUBLIC_SUPABASE_* from env)
  social/              # Supabase-backed data access: profiles, chats, leaderboard, sync, types
store/
  useWorkoutStore.ts   # Active workout state (Zustand)
  useTimerStore.ts     # Rest timer state
  useAuthStore.ts      # Supabase session + profile state (Zustand)
constants/
  colors.ts            # Color tokens — see docs/DESIGN.md
  muscleGroups.ts      # Enum of valid muscle groups
supabase/
  migrations/          # SQL migrations for the social backend — run in Supabase SQL editor
```

## Key Conventions

### Database Layer (`db/`)
- Every file exports plain async functions, no classes. Example: `getExercises()`, `insertSet()`, `getLastPerformance(exerciseId, currentWorkoutId)`.
- Always enable foreign keys: `db.execSync('PRAGMA foreign_keys = ON')` on connection open.
- Use `db.runSync` / `db.getFirstSync` / `db.getAllSync` for queries (synchronous API — no need for async wrappers on reads).
- The `getLastPerformance` query is the most important in the app. See `docs/SCHEMA.md` for the exact SQL and formatting logic.
- Seed data runs once on first launch. Gate it with a `user_version` PRAGMA check.

### Zustand Stores
- `useWorkoutStore` holds all in-progress workout state: exercises added, sets logged, completion status. This is the source of truth during a session — write to SQLite on set completion and on workout finish, not on every keystroke.
- Keep stores flat. No nested objects. Use arrays of IDs + a lookup map if needed.

### Components
- `SetRow` is the most-used component. Optimize for fast input: numeric keypad, large targets (56×56px complete button), pre-fill with previous set values.
- Don't use `TextInput` `onChangeText` for weight/reps — use `onEndEditing` or `onSubmitEditing` to avoid re-renders on every character.
- Use `expo-haptics` (`Haptics.impactAsync(ImpactFeedbackStyle.Light)`) on set completion tap. Import only where used.
- **Press animations:** Always use `AnimatedPressable` (`components/AnimatedPressable.tsx`) for any pressable element that needs scale feedback. Never hand-roll Reanimated scale logic in individual components. The defaults (scale 0.97, 100ms press-in) are the app standard — only override via props if a specific element genuinely needs different values.
- **Animations:** The app uses **Reanimated v3+** (`react-native-reanimated`) exclusively — worklets, `useSharedValue`, `useAnimatedStyle`, `withTiming`, and declarative `entering`/`exiting` props. Do not use the legacy `Animated` API from `react-native` (it runs bookkeeping on the JS thread and feels choppy next to Reanimated views). Follow the patterns in `AnimatedPressable.tsx`, `AnimatedScreen.tsx`, and `AddExerciseModal.tsx`. Typical durations live in the 100–350ms range; use `Easing.out(Easing.cubic)` for slide-in and `Easing.in(Easing.cubic)` for slide-out to match the iOS modal feel.

### Navigation
- The active workout screen (`workout/[id]`) should be presented as a full-screen modal via Expo Router's `presentation: 'modal'` option. The user should not accidentally navigate away mid-workout.
- Tab bar uses 4 tabs: Home, History, Exercises, Friends. The workout, chat, and settings screens are not tabs.

### Social layer (Supabase)
- **Offline-first is non-negotiable.** The workout-logging path (`db/`, `useWorkoutStore`, SetRow, etc.) must work with no internet and no auth. Do not introduce Supabase calls into the core logging flow. The only hook from workout → Supabase is `syncWeeklyStats()` on workout finish, which is fire-and-forget.
- **Auth is optional.** The Friends tab shows a `SignInPanel` when signed out. Never block access to Home/History/Exercises/workout on auth state.
- **Config via env only.** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are read from the environment (`.env` file at repo root, gitignored). Do **not** put these in `app.json` — see `docs/SUPABASE.md` for setup.
- **Schema changes** go in `supabase/migrations/` as numbered SQL files. They are run manually in the Supabase SQL editor; the app does not apply them.
- **RLS is on for every table** — profiles, weekly_stats, chats, chat_members, messages. When adding tables, add RLS policies in the same migration.
- Data access lives in `lib/social/*`; stores (`useAuthStore`) hold session state only and call into `lib/social/` for I/O.

### Styling
- No styling library. Use `StyleSheet.create` everywhere.
- All colors come from `constants/colors.ts`. Never hardcode hex values in components.
- See `docs/DESIGN.md` for the full token set, component patterns, and typography scale.

## Workflow

**Consistency first.** Before planning or implementing anything, look at what's already working well in the codebase and stay consistent with it. Check existing components, utilities, animation libraries, styling patterns, and state conventions before reaching for something new. If the app already uses Reanimated, don't add legacy `Animated`; if it already has `AnimatedPressable`, don't hand-roll a scale animation; if there's a shared hook or helper that fits, reuse it. Plans should call out which existing patterns/files the new code mirrors. Only deviate when there's a concrete reason, and flag it explicitly in the plan.

Work in small, testable batches. After completing a meaningful unit of work (a new screen, a db layer, a component wired up end-to-end), **stop and let me test it and commit before moving on.** Do not chain multiple features together in one pass.

What counts as a batch:
- Setting up the project scaffold and confirming it runs
- The database layer + seed data (confirm tables exist, seed populates)
- A single screen or feature wired up and functional
- A bug fix or refactor

After each batch, summarize what changed and what to test. I'll verify, commit, and tell you what's next.

## Common Pitfalls

- **expo-sqlite SDK 52+ uses a synchronous API.** Do not wrap `getAllSync` in `async/await` — it returns directly. The old callback-based `db.transaction()` pattern is deprecated.
- **Expo Router modal gotcha:** modals in the `app/` directory need `unstable_settings` in the layout to set the initial route correctly, or back gestures will break.
- **KeyboardAvoidingView:** The active workout screen will have numeric inputs near the bottom. Wrap the scroll area in `KeyboardAvoidingView` with `behavior="padding"` on iOS. Test this early.
- **Set ordering:** When displaying sets, always sort by `set_order`, never by `id` or `created_at`. Users may delete and re-add sets.
- **"Last performance" edge case:** Exclude the current in-progress workout from the query, otherwise the user sees their own incomplete data as the reference.

## Reference Docs

- `docs/SCHEMA.md` — Full SQLite schema, seed exercise list, seed templates, and the "last performance" query.
- `docs/DESIGN.md` — Color tokens, typography scale, spacing grid, and component layout patterns (SetRow, ExerciseCard).
- `docs/SCOPE.md` — Full MVP scope document with feature tiers, screen breakdown, and development phases.
