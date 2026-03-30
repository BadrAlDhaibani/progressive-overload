# Proverload

Gym workout tracker focused on progressive overload. Single-user, offline-only, simplicity above all. The app does one thing: **log sets, reps, and weight** so you know what to beat next time.

## Tech Stack

- React Native + Expo (managed workflow, SDK 52+)
- Expo Router (file-based routing)
- expo-sqlite (synchronous API)
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
  workout/
    [id].tsx           # Active workout session (modal)
    summary.tsx        # Post-workout summary
components/
  SetRow.tsx           # Weight/reps/complete input row
  ExerciseCard.tsx     # Exercise block with sets inside active workout
  ExerciseListItem.tsx # Row in exercise library
  RestTimer.tsx        # Bottom sheet timer (Tier A nice-to-have)
db/
  database.ts          # SQLite init, migrations, PRAGMA setup
  exercises.ts         # Exercise CRUD
  workouts.ts          # Workout + set CRUD
  templates.ts         # Template CRUD
  seed.ts              # First-launch seed data (exercises + templates)
store/
  useWorkoutStore.ts   # Active workout state (Zustand)
  useTimerStore.ts     # Rest timer state
constants/
  colors.ts            # Color tokens — see docs/DESIGN.md
  muscleGroups.ts      # Enum of valid muscle groups
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

### Navigation
- The active workout screen (`workout/[id]`) should be presented as a full-screen modal via Expo Router's `presentation: 'modal'` option. The user should not accidentally navigate away mid-workout.
- Tab bar uses 3 tabs: Home, History, Exercises. The workout screen is not a tab.

### Styling
- No styling library. Use `StyleSheet.create` everywhere.
- All colors come from `constants/colors.ts`. Never hardcode hex values in components.
- See `docs/DESIGN.md` for the full token set, component patterns, and typography scale.

## Workflow

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
