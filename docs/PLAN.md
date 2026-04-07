# Proverload Implementation Plan

## Context

Building a gym workout tracker app from an Expo scaffold. The scaffold has dependencies installed (expo-sqlite, zustand, expo-haptics, expo-router) and a 2-tab placeholder layout, but zero domain logic. Everything in `db/`, `store/`, and domain components needs to be built from scratch. The full spec lives in `docs/SCHEMA.md`, `docs/DESIGN.md`, and `docs/SCOPE.md`.

The plan follows the iterative batch workflow from `CLAUDE.md`: one testable unit per batch, stop for user to verify and commit before moving on.

---

## Progress

| Batch | Status | Description |
|-------|--------|-------------|
| 1 | Done | Design Tokens + Navigation Shell |
| 2 | Done | Database Layer + Seed Data |
| 3 | Done | Exercise Library Screen |
| — | Done | Bugfix: tab bar icon jitter on tap + swipe delay (PagerView scroll/select handling) |
| — | Done | Bugfix: circular dependency db/database.ts ↔ db/seed.ts |
| 4 | Done | Zustand Store + Start Workout Flow |
| — | Done | Bugfix: safe area handling — removed headers, SafeAreaView for notch/home indicator |
| 5 | Done | Add Exercise to Workout (1 set default, not 3) |
| 6 | Done | SetRow + Set Logging (CRITICAL) |
| 7 | Done | Last Performance Display |
| 8 | Done | Finish Workout + Summary + Home Recent |
| 9 | Done | History Screen + Detail |
| 10a | Done | Start Workout from Templates |
| 10b | Done | Template CRUD (create, edit, delete) |
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
- `components/ExerciseCard.tsx` — Exercise name, "Last: --" placeholder, set column headers, placeholder set rows, "Add Set" button. Memo-wrapped, uses `useShallow` for set list filtering.
- `app/workout/add-exercise.tsx` — Exercise picker modal with search, muscle group chips, already-added exercises shown with checkmark (disabled). Tapping adds exercise + 1 empty set to store, then navigates back.

**Modify:**
- `app/workout/[id].tsx` — Render ExerciseCards from store, "Add Exercise" navigates to picker via `router.push('/workout/add-exercise')`
- `app/_layout.tsx` — Register `workout/add-exercise` as `presentation: 'modal'` with `gestureEnabled: true`

**Note**: Default is 1 set per exercise added (not 3 as originally planned). User can tap "Add Set" for more.

**Test**: Add exercises to workout, they appear as cards. Can add multiple. Already-added exercises show checkmark.

---

## Batch 6: SetRow + Set Logging (CRITICAL)

**Goal**: Core interaction — enter weight/reps, tap complete, haptic fires, row tints rose.

**Create:**
- `components/SetRow.tsx` — Memo-wrapped presentational component. Props: localId, setOrder, weight, reps, isComplete, onUpdateSet, onCompleteSet.
  - Local `useState<string>` for weight/reps text (avoids store writes per keystroke)
  - `onEndEditing` parses text → number and calls `onUpdateSet`
  - `onChangeText` updates local string state only
  - Complete button: 56x56 Pressable, `Ionicons checkmark-circle` (filled, primary) when done, `ellipse-outline` (border color) when pending
  - Haptic on complete: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
  - Completed row: `primaryLight` background tint
  - Inputs: `keyboardType="numeric"`, `selectTextOnFocus`, fontSize 20, fontWeight '700', bordered, minHeight 44

**Modify:**
- `components/ExerciseCard.tsx` — Import SetRow, add `updateSet`/`completeSet` store selectors, replace placeholder set rows with `<SetRow>` components, update `checkCol` width from 40→56 to match, remove unused styles (setRow, setNumber, placeholder, emptyCircle)

**No store changes needed** — `updateSet`, `completeSet`, `removeSet` are already implemented and handle DB writes correctly.

**Test**: Enter weight/reps → blur commits to store. Tap complete → haptic fires, row turns pink, circle fills rose. Un-complete toggles back. Null weight/reps allowed (bodyweight). Column headers align with inputs.

---

## Batch 7: Last Performance + Set/Exercise Management

**Goal**: Show previous workout data per exercise, pre-fill sets from last session, and add set/exercise removal UX.

**Create:**
- `utils/formatLastPerformance.ts` — Formats last performance sets into summary string ("Last: 3 sets" or "Last: --")

**Modify:**
- `components/ExerciseCard.tsx` — Query `getLastPerformance()`, display formatted summary via `formatLastPerformance`. Long-press exercise name to remove exercise (with Alert confirmation). Pass `onRemoveSet` to SetRow.
- `components/SetRow.tsx` — Swipe-to-delete via `Swipeable` from `react-native-gesture-handler`. Flush pending text input values to store on complete tap (fixes race condition when TextInput still focused). Added `rowDefault` background for clean swipe reveal.
- `app/workout/add-exercise.tsx` — Pre-fill sets from last performance when adding exercise. Uses `addSetWithValues` if history exists, falls back to empty `addSet`.
- `store/useWorkoutStore.ts` — New actions: `addSetWithValues` (add set with pre-filled weight/reps), `removeExercise` (remove exercise + its sets from state and DB).

**Test**: Complete a workout, start new one with same exercise — see last performance summary + pre-filled set values. Swipe set left to delete. Long-press exercise name to remove with confirmation.

---

## Batch 8: Finish Workout + Summary + Home Recent

**Goal**: Complete workout flow end-to-end.

**Create:**
- `app/workout/summary.tsx` — Post-workout summary screen: duration (from DB timestamps), exercise count, set count, total volume, per-exercise breakdown with weight×reps. "Done" button navigates home via `router.replace('/')`. Data read from DB (`getWorkoutById` + `getWorkoutSets`) since store resets on finish. Android `BackHandler` intercepts hardware back to navigate home instead of returning to cleared workout screen.

**Modify:**
- `app/workout/[id].tsx` — Finish now captures `workoutId` before `finish()` resets state, then navigates to summary via `router.replace()` instead of `router.back()`.
- `app/_layout.tsx` — Registered `workout/summary` route with `gestureEnabled: false` to prevent swiping back to dead workout screen.
- `components/screens/HomeContent.tsx` — Removed debug exercise/template counts. Removed unused `FlatList` import. Added "Recent Workouts" section (last 5 finished workouts) with date, exercise/set counts, and duration. Tap opens summary. Uses `useFocusEffect` to refresh on tab focus.

**Test**: Full flow: start, log, finish, summary, home shows recent workout. Tap recent workout to re-view summary. Discard skips summary. Android back on summary goes home.

---

## Batch 9: History Screen + Detail

**Goal**: Browse past workouts, view details. Reuse existing summary screen as detail view.

**Modify:**
- `db/workouts.ts` — Added `getAllWorkouts()` (all finished workouts, no limit)
- `components/screens/HistoryContent.tsx` — Full rewrite: SectionList grouped by month, enriched workout rows (exercise/set counts, duration), empty state, `useFocusEffect` refresh, navigates to summary with `from=history` param
- `app/workout/summary.tsx` — Context-aware via `from` query param: shows "Workout Summary" heading + "Back" button when `from=history`, uses `router.back()` to return to History tab. Post-workout flow unchanged ("Workout Complete" + "Done" → Home).

**Test**: History shows all workouts grouped by month. Tap workout → summary with "Workout Summary" heading. "Back" returns to History tab. Home recent workouts still show "Workout Complete" + "Done" goes home.

---

## Batch 10a: Start Workout from Templates

**Goal**: Surface templates on Home screen as a horizontal carousel, start workouts from them with smart set pre-filling.

**Modify:**
- `components/screens/HomeContent.tsx` — Horizontal carousel of template cards (minWidth 140 for consistent sizing) between Start Workout button and Recent Workouts. Tapping a template creates a named workout, populates exercises, and pre-fills sets from last performance. When no history exists, falls back to template `default_sets` × `default_reps` instead of a single empty set. Wrapped Home in ScrollView (removed dead `flex: 1` from `recentSection`).

**Test**: Templates show as horizontal carousel with consistent card widths. Tap template → workout opens with correct exercises. Exercises with history get pre-filled sets; exercises without get `default_sets` sets pre-filled with `default_reps`. Home page scrolls when content overflows.

---

## Batch 10b: Template CRUD

**Goal**: Create custom templates, edit existing ones (add/remove exercises, adjust default sets/reps), delete templates.

**Create:**
- `store/useTemplateFormStore.ts` — Zustand store for template form state (exercises list, add/remove/update defaults/reset). Shared between edit and pick-exercise screens.
- `app/template/edit.tsx` — Full-screen modal for creating/editing templates. Name input, exercise list with inline sets×reps editing, add/remove exercises. ExerciseRow sub-component receives parent styles as prop.
- `app/template/pick-exercise.tsx` — Modal exercise picker with search + muscle group chips. Reuses `ExerciseListItem`. Already-added exercises shown with checkmark (disabled). Pre-fills default_sets/reps from last performance history.

**Modify:**
- `db/templates.ts` — New functions: `createTemplate()`, `updateTemplate()`, `deleteTemplate()`, `replaceTemplateExercises()` (transactional DELETE+INSERT). Changed `getAllTemplates()` to sort by `created_at DESC`.
- `constants/colors.ts` — Added `textOnPrimary` token for contrast text on primary backgrounds.
- `components/screens/HomeContent.tsx` — Templates section always visible with dashed "New" card. Long-press template for Edit/Delete menu (with confirmation). Extracted `loadTemplates()` helper reused in `useFocusEffect` and delete callback.
- `app/_layout.tsx` — Registered `template/edit` (fullScreenModal, no gesture) and `template/pick-exercise` (modal, gesture enabled) routes.

**Code review fixes applied:**
- Transaction wrapping on `replaceTemplateExercises` to prevent partial data loss
- Replaced hardcoded `#ffffff` with `colors.textOnPrimary` token
- Removed unused `useFocusEffect` import from edit.tsx
- Deduplicated exercise mapping in `handleSave`
- Extracted `loadTemplates` to eliminate duplicate template-fetching logic
- `ExerciseRow` receives styles as prop instead of recreating per instance
- Stable `Separator` components via `useCallback` for FlatList
- Documented magic `0` in `getLastPerformance` call

**Test**: Create custom template, add exercises with sets×reps, save. Edit existing template (rename, add/remove exercises, change defaults). Delete template with confirmation. Start workout from custom template. "New" card always visible in carousel.

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
