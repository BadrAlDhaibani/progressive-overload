# Proverload Implementation Plan

## Context

Building a gym workout tracker app from an Expo scaffold. The scaffold has dependencies installed (expo-sqlite, zustand, expo-haptics, expo-router) and a 2-tab placeholder layout, but zero domain logic. Everything in `db/`, `store/`, and domain components needs to be built from scratch. The full spec lives in `docs/SCHEMA.md`, `docs/DESIGN.md`, and `docs/SCOPE.md`.

The plan follows the iterative batch workflow from `CLAUDE.md`: one testable unit per batch, stop for user to verify and commit before moving on.

---

## Progress

| Batch | Status | Description |
|-------|--------|-------------|
| 1 | Not started | Design Tokens + Navigation Shell |
| 2 | Not started | Database Layer + Seed Data |
| 3 | Not started | Exercise Library Screen |
| 4 | Not started | Zustand Store + Start Workout Flow |
| 5 | Not started | Add Exercise to Workout |
| 6 | Not started | SetRow + Set Logging (CRITICAL) |
| 7 | Not started | Last Performance Display |
| 8 | Not started | Finish Workout + Summary + Home Recent |
| 9 | Not started | History Screen + Detail |
| 10 | Not started | Templates |
| 11 | Not started | Polish |
| 12 | Not started | Rest Timer (Optional) |

---

## Batch 1: Design Tokens + Navigation Shell

**Goal**: Replace scaffold boilerplate with 3-tab layout and app color tokens. App launches with correct structure and rose accent, no functionality yet.

**Create:**
- `constants/colors.ts` — Full color tokens from DESIGN.md (bg, primary, text, border, etc.)
- `constants/muscleGroups.ts` — 10 muscle group strings + type
- `app/(tabs)/history.tsx` — Placeholder screen
- `app/(tabs)/exercises.tsx` — Placeholder screen

**Modify:**
- `app/_layout.tsx` — Remove dark theme, SpaceMono font, ThemeProvider. Add workout modal Stack screens. Init splash screen handling.
- `app/(tabs)/_layout.tsx` — 3 tabs (Home/History/Exercises) with rose tint, remove dark/light logic
- `app/(tabs)/index.tsx` — Minimal Home with "Start Workout" button

**Delete:** `app/(tabs)/two.tsx`, `app/modal.tsx`, `constants/Colors.ts`, scaffold components (`EditScreenInfo`, `ExternalLink`, `StyledText`, `Themed`, `useColorScheme`, `useClientOnlyValue` and their `.web` variants)

**Test**: App launches, 3 tabs visible with rose accent, no crashes.

---

## Batch 2: Database Layer + Seed Data

**Goal**: SQLite initialized with all 5 tables, indexes, ~65 seed exercises, 5 templates.

**Create:**
- `db/database.ts` — Open DB, PRAGMA setup, schema DDL, `initDatabase()` gated by `user_version`
- `db/seed.ts` — Insert all exercises and templates from SCHEMA.md
- `db/exercises.ts` — `getAllExercises()`, `getExercisesByMuscleGroup()`, `searchExercises()`, `insertCustomExercise()`
- `db/workouts.ts` — `createWorkout()`, `finishWorkout()`, `getRecentWorkouts()`, `insertSet()`, `updateSet()`, `deleteSet()`, `getLastPerformance()`, etc.
- `db/templates.ts` — `getAllTemplates()`, `getTemplateWithExercises()`

**Modify:**
- `app/_layout.tsx` — Call `initDatabase()` on startup
- `app/(tabs)/index.tsx` — Temp debug: show exercise/template counts

**Test**: App launches, Home shows "65 exercises, 5 templates". Relaunch doesn't re-seed.

---

## Batch 3: Exercise Library Screen

**Goal**: Fully functional Exercises tab with search, muscle group filtering, add custom exercise.

**Create:**
- `components/ExerciseListItem.tsx` — Pressable row with name, muscle group badge, equipment tag

**Modify:**
- `app/(tabs)/exercises.tsx` — Search bar, horizontal muscle group filter chips, FlatList of exercises, FAB/header button for adding custom exercise

**Test**: Search filters by name, chips filter by group, adding custom exercise works.

---

## Batch 4: Zustand Store + Start Workout Flow

**Goal**: In-memory workout state and navigation to active workout modal.

**Create:**
- `store/useWorkoutStore.ts` — Flat Zustand store: workoutId, exercises, sets, actions (startWorkout, addExercise, addSet, updateSet, removeSet, finishWorkout, discardWorkout). Local IDs for sets, write to SQLite on completion/finish only.
- `app/workout/[id].tsx` — Minimal full-screen modal with workout name, "Finish" and "Add Exercise" buttons, `KeyboardAvoidingView`

**Modify:**
- `app/(tabs)/index.tsx` — Wire "Start Workout" to create workout + navigate to modal
- `app/_layout.tsx` — Ensure workout screens use `fullScreenModal` presentation

**Test**: Tap "Start Workout", modal opens. Back/Finish returns to Home.

---

## Batch 5: Add Exercise to Workout

**Goal**: Select exercises from library to add to active workout.

**Create:**
- `components/ExerciseCard.tsx` — Exercise name, "Last: ..." placeholder, set list area, "Add Set" button
- `app/workout/add-exercise.tsx` — Exercise picker (reuses search/filter logic), tapping adds exercise + 3 empty sets to store

**Modify:**
- `app/workout/[id].tsx` — Render ExerciseCards from store, "Add Exercise" navigates to picker

**Test**: Add exercises to workout, they appear as cards. Can add multiple.

---

## Batch 6: SetRow + Set Logging (CRITICAL)

**Goal**: Core interaction — enter weight/reps, tap complete, haptic fires, row tints rose.

**Create:**
- `components/SetRow.tsx` — Set number, weight input (numeric, `onEndEditing`), reps input, 56x56 complete button. Completed = rose fill + `primaryLight` bg. Haptic on complete.

**Modify:**
- `components/ExerciseCard.tsx` — Render SetRows, wire to store, "Add Set" button
- `store/useWorkoutStore.ts` — Refine write logic: insert to SQLite on complete, update on re-complete

**Test**: Full set logging flow. Enter weight/reps, complete, haptic fires, visual feedback works. Add/remove sets.

---

## Batch 7: Last Performance Display

**Goal**: Show previous workout data per exercise.

**Modify:**
- `components/ExerciseCard.tsx` — Query `getLastPerformance()`, format as "Last: 3x8 @ 185 lbs", use as SetRow placeholder values
- `db/workouts.ts` — Verify grouping logic (only most recent workout's sets)

**Test**: Complete a workout, start new one with same exercise, see last performance data + pre-filled placeholders.

---

## Batch 8: Finish Workout + Summary + Home Recent

**Goal**: Complete workout flow end-to-end.

**Create:**
- `app/workout/summary.tsx` — Duration, exercises, sets, volume, "Done" button

**Modify:**
- `app/workout/[id].tsx` — Finish confirmation, discard option
- `store/useWorkoutStore.ts` — Flush remaining sets to SQLite on finish
- `app/(tabs)/index.tsx` — Recent workouts section (last 5)

**Test**: Full flow: start, log, finish, summary, home shows recent workout.

---

## Batch 9: History Screen + Detail

**Goal**: Browse past workouts, view details.

**Create:**
- `app/history/[id].tsx` — Read-only workout detail view

**Modify:**
- `app/(tabs)/history.tsx` — SectionList grouped by date, tap for detail
- `db/workouts.ts` — `getAllWorkouts()`, `getWorkoutDetail()`

**Test**: History shows all workouts by date, detail view shows exercises and sets.

---

## Batch 10: Templates

**Goal**: Start workouts from pre-seeded templates.

**Modify:**
- `app/(tabs)/index.tsx` — Template cards section, tap to start pre-populated workout
- `store/useWorkoutStore.ts` — `startFromTemplate()` action

**Test**: Tap template, workout opens with correct exercises and set counts.

---

## Batch 11: Polish

**Goal**: Visual consistency, edge cases, haptics audit.

- Audit all files for hardcoded colors, undersized touch targets
- Handle edge cases: empty workouts, bodyweight exercises, long names
- Pull-to-refresh on History/Exercises
- Keyboard dismiss on scroll, KeyboardAvoidingView verification
- Safe area insets on all screens

---

## Batch 12 (Optional): Rest Timer

**Create:**
- `store/useTimerStore.ts` — Timer state
- `components/RestTimer.tsx` — Floating countdown bar, duration presets, haptic on zero

**Modify:**
- `app/workout/[id].tsx` — Render RestTimer
- `store/useWorkoutStore.ts` — Auto-start timer on set complete

---

## Key Architecture Decisions

1. **Local IDs for sets** — Zustand uses string IDs (counter), DB IDs assigned on persist. Avoids DB round-trip for every empty set.
2. **Write on complete, not on keystroke** — Store is source of truth during workout. SQLite writes on set completion + workout finish.
3. **Synchronous SQLite API** — `runSync`/`getAllSync`/`getFirstSync`. No async wrappers needed.
4. **Light mode only** — No dark theme. Remove all scaffold dark/light abstractions.
5. **Full-screen modal for workout** — Prevents accidental navigation away mid-workout.

## Verification

After each batch: app launches without crashes, the specific feature works as described in "Test" section. After Batch 8, the complete core loop is testable end-to-end (start workout, log sets, finish, see history, see last performance).
