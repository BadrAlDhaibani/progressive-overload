---
name: review-batch
description: Review the current uncommitted/branch diff against Provolone's CLAUDE.md conventions. Use when the user says "/review-batch", "review this batch", "check the diff", or before producing a commit/PR. Reports violations as a checklist with file:line references.
disable-model-invocation: true
allowed-tools: Bash(git status*) Bash(git diff*) Bash(git log*) Bash(npx tsc*) Read Grep Glob
---

# /review-batch

Run a Provolone-specific code review on the current batch's changes. This skill replaces re-reading CLAUDE.md from scratch on every batch — the rules below are pulled directly from it.

## Steps

1. Run `git status` and `git diff` to see uncommitted changes. If the working tree is clean, also run `git diff main...HEAD` for branch-only commits. Use whichever set has content.
2. List changed files. For each, walk the rule categories below and flag violations with `path/to/file.ts:LINE — short fix`.
3. Run `npx tsc --noEmit` and surface any type errors.
4. End with the checklist summary in the **Output format** section.

If the diff is empty, say so and stop — don't fabricate findings.

## Rules

### Styling (`components/`, `app/`)
- **Colors:** all colors come from `constants/colors.ts`. Flag any hex literal (`#[0-9a-fA-F]{3,8}`) or named CSS color in `.tsx`/`.ts` files outside `constants/`. Whitelist: `'transparent'`, `'rgba(0,0,0,0)'`.
- **Animations:** Reanimated v3 only. Flag any import of `Animated` from `react-native`. Allowed: `react-native-reanimated`'s `useSharedValue`, `useAnimatedStyle`, `withTiming`, `withSpring`, `Easing`, and declarative `entering`/`exiting` props.
- **Press feedback:** pressable elements that scale on press must use `AnimatedPressable` from `components/AnimatedPressable.tsx`. Flag hand-rolled scale logic (`useSharedValue` + `Pressable` + `onPressIn`/`onPressOut` writing to a shared value for scale).
- **No styling library.** Flag any new dependency on styled-components, nativewind, tamagui, restyle, etc.
- **No navigation headers** by default — screens set `headerShown: false`. Flag new screens that don't.

### Database layer (`db/*.ts`)
- **Offline-first.** Flag any import from `lib/supabase`, `lib/social/`, or `@supabase/supabase-js` inside `db/`.
- **Foreign keys ON.** New connections must run `db.execSync('PRAGMA foreign_keys = ON')`.
- **Synchronous API.** Flag `await` on `getAllSync`, `getFirstSync`, `runSync`, `execSync` — they're synchronous in expo-sqlite SDK 52+.
- **Set ordering.** Any query that returns sets for display must `ORDER BY set_order`, never by `id` or `created_at`.
- **`getLastPerformance` exclusion.** Confirm the query still excludes the current in-progress workout (the `WHERE workout_id != ?` or equivalent guard).
- **Seed gating.** Seed data runs once, gated by `user_version` PRAGMA. Flag unconditional inserts in `db/seed.ts`.

### State (`store/*.ts`)
- **No Supabase calls** in `useWorkoutStore` or `useTimerStore`. The only sync hook from workout → Supabase is `syncWeeklyStats()` on workout finish, fire-and-forget.
- **Flat shape.** Stores hold arrays of IDs + lookup maps, not nested objects.
- **Write timing.** `useWorkoutStore` writes to SQLite on set complete and workout finish, not on every keystroke. Flag SQLite writes inside `onChangeText` paths.

### Inputs (`SetRow.tsx` and similar numeric inputs)
- **No `onChangeText` for weight/reps.** Use `onEndEditing` or `onSubmitEditing`. Flag `onChangeText={…setWeight…}` patterns.
- **Numeric keyboard.** `keyboardType="decimal-pad"` for weight, `"numeric"` for reps.

### Social layer (`lib/social/`, `supabase/migrations/`)
- **Auth is optional.** Flag any code in non-Friends paths that gates UI on `useAuthStore.session`. Friends tab is the only place that should show a sign-in panel.
- **Env config only.** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` come from `.env`, never from `app.json`. Flag changes to `app.json` that add Supabase keys.
- **RLS on every new table.** If a migration adds `CREATE TABLE`, flag it unless the same migration also `ENABLE ROW LEVEL SECURITY` and adds at least one policy.
- **Numbered migrations.** New SQL files in `supabase/migrations/` follow the existing `NNNN_*.sql` numbering and don't reuse a number.

### Navigation
- **Active workout is a modal.** `app/workout/[id].tsx` must be presented via `presentation: 'modal'` in the parent layout. Flag changes that remove this.
- **4 tabs only.** Home, History, Exercises, Friends. Flag tab additions/removals.

### General
- **No new dependencies** without justification — call out any change to `package.json` `dependencies` or `devDependencies`.
- **CLAUDE.md drift.** If a new pattern is being introduced (e.g. a new shared hook, a new store, a new design token), note it under "Conventions to capture" so the user can run `/capture-pattern` after.

## Output format

Report in this exact shape:

```
## /review-batch

Files changed: <count>

### Checklist
- [✓/✗] Styling
- [✓/✗] Database layer
- [✓/✗] State
- [✓/✗] Inputs
- [✓/✗] Social layer
- [✓/✗] Navigation
- [✓/✗] General
- [✓/✗] TypeScript (`tsc --noEmit`)

### Issues
1. `path/to/file.ts:LINE` — <one-line fix>
2. ...

### Conventions to capture (if any)
- <new pattern noticed>
```

If everything passes, say "All categories pass — ready to commit." and skip the Issues block.
