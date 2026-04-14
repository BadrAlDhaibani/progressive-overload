# Provolone Implementation Plan

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
| 11 | Done | Polish |
| P1 | Done | Inter Font Loading |
| P2 | Done | Apply Inter Across All Components |
| P3 | Done | Muscle Group Badge Colors |
| P4 | Done | Card Shadows & Depth |
| P5 | Done | Screen Fade-In Animations |
| P6 | Done | Button Press Scale Animation |
| P7 | Done | Set Completion Bounce Animation |
| P8 | Done | Gradient Start Workout Button |

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

**Goal**: Visual consistency, pull-to-refresh, minor UX improvements.

**Hardcoded color fixes (9 instances):**
- Replaced all `#ffffff` with `colors.textOnPrimary` across 7 files: SetRow, HomeContent, ExercisesContent (×4), add-exercise, summary, [id]
- Added `colors` to `renderRightActions` dep array in SetRow

**Pull-to-refresh (3 screens):**
- `HistoryContent.tsx` — Extracted `loadWorkouts`, added `RefreshControl` to `SectionList`
- `ExercisesContent.tsx` — Added `RefreshControl` to main `FlatList` (bumps `refreshKey`)
- `HomeContent.tsx` — Extracted `loadData`, added `RefreshControl` to `ScrollView`
- All use `colors.primary` tint for the spinner

**Minor improvements:**
- `SetRow.tsx` — hitSlop 4→8 on checkbox (effective target now 44px)
- `ExercisesContent.tsx` — Stabilized `ItemSeparatorComponent` with `useCallback`

**Already handled (no changes needed):**
- Safe area insets: tab layout wraps pages in SafeAreaView
- Edge cases: empty workouts, bodyweight (BW), long names (numberOfLines={1})
- Keyboard: KeyboardAvoidingView + keyboardDismissMode on relevant screens
- Touch targets: all ≥44px
- Haptics: already on set complete

**Test**: Pull down on Home, History, Exercises → spinner appears with rose tint, data reloads. All buttons/text on primary backgrounds still readable. Checkbox easy to tap near edges.

---

## Batch P1: Inter Font Loading

**Goal**: Load Inter font weights, create typography constants. No visual change yet.

**Install:** `npx expo install @expo-google-fonts/inter`

**Create:**
- `constants/typography.ts` — Font family map: `{ regular: 'Inter_400Regular', medium: 'Inter_500Medium', semiBold: 'Inter_600SemiBold', bold: 'Inter_700Bold' }`

**Modify:**
- `app/_layout.tsx` — Import Inter weights from `@expo-google-fonts/inter`, add to `useFonts` call

**Test:** App launches without errors, splash screen dismisses correctly.

---

## Batch P2: Apply Inter Across All Components

**Goal**: Replace system font with Inter across the entire app.

**Key rule:** On Android, `fontWeight` is ignored when `fontFamily` is set. Replace `fontWeight` with the matching `fontFamily` entry and remove `fontWeight`.

**Weight mapping:**
- `'400'` → `fonts.regular`
- `'500'` → `fonts.medium`
- `'600'` → `fonts.semiBold`
- `'700'` → `fonts.bold`

**Modify (all files with text styles):**
1. `components/screens/HomeContent.tsx`
2. `components/screens/HistoryContent.tsx`
3. `components/screens/ExercisesContent.tsx`
4. `components/ExerciseCard.tsx`
5. `components/ExerciseListItem.tsx`
6. `components/SetRow.tsx`
7. `app/workout/[id].tsx`
8. `app/workout/summary.tsx`
9. `app/workout/add-exercise.tsx`
10. `app/template/edit.tsx`
11. `app/template/pick-exercise.tsx`
12. `app/(tabs)/_layout.tsx` (tab bar label font)

**Note:** `TextInput` components also need `fontFamily` for typed text to render in Inter.

**Test:** Open every screen — all text renders in Inter. Bold numbers in SetRow still look bold. No text clipping.

---

## Batch P3: Muscle Group Badge Colors

**Goal**: Each of the 10 muscle groups gets a unique pastel badge color.

**Create:**
- `constants/muscleGroupColors.ts` — Map of `MuscleGroup` → `{ bg, text }` color pairs. Soft pastels:
  - Chest: rose-red, Back: blue, Shoulders: orange, Biceps: green, Triceps: purple
  - Quads: teal, Hamstrings: amber, Glutes: pink, Core: deep purple, Calves: dark teal

**Modify:**
- `components/ExerciseListItem.tsx` — Import color map, use per-group colors for badge (fallback to rose)
- `components/screens/ExercisesContent.tsx` — Color active filter chips with group color
- `app/workout/add-exercise.tsx` — Same chip coloring
- `app/workout/summary.tsx` — Color muscle group labels if present

**Test:** Exercises tab shows distinct badge colors per group. Filter chips tint to match. Summary screen matches.

---

## Batch P4: Card Shadows & Depth

**Goal**: Soft shadows on all card elements for visual hierarchy.

**Create:**
- `constants/shadows.ts` — Platform-aware shadow style:
  - iOS: `shadowColor '#000', shadowOffset {0,2}, shadowOpacity 0.08, shadowRadius 8`
  - Android: `elevation: 2`

**Modify:**
- `components/ExerciseCard.tsx` — Add shadow. Handle `overflow: 'hidden'` conflict on iOS (wrap in outer View with shadow, keep overflow hidden on inner)
- `components/screens/HomeContent.tsx` — Shadow on `.startButton`, `.templateCard`, `.workoutRow`
- `components/screens/HistoryContent.tsx` — Shadow on `.workoutRow`
- `app/workout/summary.tsx` — Shadow on stat cards / exercise blocks

**Test:** Cards float above background on both iOS and Android. Swipe-to-delete on SetRow still works.

---

## Batch P5: Screen Fade-In Animations

**Goal**: Smooth fade-in when navigating to screens.

**Create:**
- `components/AnimatedScreen.tsx` — Reanimated `Animated.View` wrapper with `FadeIn.duration(300)` entering animation

**Modify (wrap screen content):**
- `components/screens/HomeContent.tsx`
- `components/screens/HistoryContent.tsx`
- `components/screens/ExercisesContent.tsx`
- `app/workout/[id].tsx`
- `app/workout/summary.tsx`

**Test:** Navigate between tabs/screens — content fades in smoothly. No flickering or double-animation. Tab swiping still smooth.

---

## Batch P6: Button Press Scale Animation

**Goal**: Subtle scale-down (0.97) on press for tactile visual feedback.

**Create:**
- `components/AnimatedPressable.tsx` — Reanimated-powered pressable: press scales to 0.97 (100ms), release to 1.0 (150ms). Accepts all Pressable props.

**Modify (replace key Pressables):**
- `components/screens/HomeContent.tsx` — Start Workout button, template cards, workout rows
- `components/ExerciseCard.tsx` — Add Set button
- `app/workout/[id].tsx` — Finish Workout, Add Exercise buttons
- `app/workout/summary.tsx` — Done/Back button

**Test:** Press and hold buttons — visible shrink. Release — spring back. Works alongside existing press color changes.

---

## Batch P7: Set Completion Bounce Animation

**Goal**: Checkmark pop animation on set completion + lock inputs when complete.

**Modify:**
- `components/SetRow.tsx`:
  - Reanimated checkmark pop on completion (`false → true`): `1.0 → 1.3 → 1.0` scale via `withSequence`/`withTiming`
  - Track previous `isComplete` with `useRef` to avoid animating on mount
  - Added `editable={!isComplete}` on weight/reps TextInputs — completed sets are locked, uncompleting re-enables editing
  - Row pulse animation was removed (user preference)

**Test:** Complete a set — checkmark pops, inputs become non-editable. Uncomplete — inputs editable again, no animation. Rapid completions don't lag. Swipeable still works.

---

## Batch P8 (Optional): Gradient Start Workout Button

**Install:** `npx expo install expo-linear-gradient`

**Modify:**
- `components/screens/HomeContent.tsx` — Replace solid background with `LinearGradient` from `primaryMedium` → `primary`. Wrap in `AnimatedPressable` from P6.

**Test:** Home button has subtle gradient. Press scales down. Still navigates correctly.

---

## Dependency Order

```
P1 → P2 (font must load before applying)
P3, P4, P5, P6, P7 are independent (any order after P2)
P8 depends on P6 (uses AnimatedPressable)
```

---

## Key Architecture Decisions

1. **Local IDs for sets** — Zustand uses string IDs (counter), DB IDs assigned on persist. Avoids DB round-trip for every empty set.
2. **Write on complete, not on keystroke** — Store is source of truth during workout. SQLite writes on set completion + workout finish.
3. **Synchronous SQLite API** — `runSync`/`getAllSync`/`getFirstSync`. No async wrappers needed.
4. **Light mode only** — No dark theme. Remove all scaffold dark/light abstractions.
5. **Full-screen modal for workout** — Prevents accidental navigation away mid-workout.

## Verification

After each batch: app launches without crashes, the specific feature works as described in "Test" section. After Batch 8, the complete core loop is testable end-to-end (start workout, log sets, finish, see history, see last performance).

---
---

# Phase 1.5: Post-Testing Feature Additions

## Context

After TestFlight testing (S5), user and tester feedback identified 7 quality-of-life improvements to implement before App Store submission. These range from small UX tweaks to a new exercise history screen. Organized into 6 batches following the same iterative workflow.

## Progress

| Batch | Status | Description |
|-------|--------|-------------|
| F1 | Done | Floating Blurred Elapsed Timer |
| F2 | Done | Long-Press Pulse on Exercise Cards |
| F3 | Pending | Custom Exercise Creation Mid-Workout |
| F4 | Pending | Assisted Weight Input |
| F5 | Pending | Workout UX: Full Swipe Delete + Smart Finish Warning |
| F6 | Pending | Exercise History & Progression Screen |

## Dependency Chain

```
F1, F2, F5 — independent (any order)
F3 → F4 (assisted toggle added to both creation flows)
F6 — independent but largest, do last
```

---

## F1: Floating Blurred Elapsed Timer

**Goal**: Persistent floating timer visible while scrolling through exercises during a workout.

**Install:** `npx expo install expo-blur`

**Modify:**
- `app/workout/[id].tsx`:
  - Extract the timer display from the header into a floating `BlurView` overlay
  - Position with `position: 'absolute'`, pinned near the top of the screen (below safe area)
  - Use `expo-blur` `BlurView` with `intensity={80}` and `tint` matching theme for frosted glass effect
  - Reuse existing `formatElapsed()` helper and `elapsed` state (driven by `startedAt` from store)
  - `pointerEvents="none"` on the blur container so it doesn't block scroll/touch
  - Ensure the ScrollView has enough top padding so content isn't hidden behind the timer
  - Remove the old static timer from the scrollable header area

**Test**: Start a workout, add several exercises with multiple sets. Scroll down — timer stays visible floating at top with blur backdrop. Timer continues counting. Taps on inputs below the timer still work.

---

## F2: Long-Press Pulse on Exercise Cards

**Goal**: Visual feedback when holding an exercise card before the remove alert fires.

**Modify:**
- `components/ExerciseCard.tsx`:
  - Convert the exercise name `Pressable` to use Reanimated animated styles
  - On `onPressIn`: start a `withTiming` scale animation from `1.0 → 1.02` over 400ms (matching `delayLongPress`)
  - On `onPressOut`: animate back to `1.0` over 150ms
  - Apply the animated scale to the entire card container (not just the name area) so the whole card subtly pulses
  - Use `useSharedValue` + `useAnimatedStyle` pattern (already used in SetRow for checkmark animation)

**Test**: Long-press an exercise card — card subtly grows during the hold. Release before 400ms — card springs back, no alert. Hold past 400ms — alert fires, card resets on release.

---

## F3: Custom Exercise Creation Mid-Workout

**Goal**: Add custom exercises without leaving the active workout.

**Modify:**
- `app/workout/add-exercise.tsx`:
  - Add a "+" button in the header area (same placement pattern as `ExercisesContent.tsx`)
  - Add the custom exercise creation modal (same fields: name, muscle group chips, equipment chips)
  - Reuse the same validation logic: trim whitespace, prevent empty names
  - On successful creation via `insertCustomExercise()`, refresh the exercise list so the new exercise appears immediately
  - The new exercise can then be tapped to add it to the workout like any other exercise

**Shared logic to extract (optional):**
- The modal UI (name input, muscle group chips, equipment chips, Add/Cancel buttons) is identical between `ExercisesContent.tsx` and the new mid-workout modal. Consider extracting to a `components/AddExerciseModal.tsx` shared component to avoid duplication. Both screens would pass an `onAdd` callback and `visible`/`onClose` props.

**Test**: During a workout, tap "Add Exercise" → exercise picker opens. Tap "+" → custom exercise modal appears. Create exercise (e.g., "Band Pull-Apart", Back, Bodyweight). Modal closes, new exercise appears in the list. Tap it to add to workout. Exercise also appears in the Exercises tab after workout.

---

## F4: Assisted Weight Input

**Goal**: Support "assisted lbs" for exercises like pull-ups and dips where a machine offsets bodyweight.

### Schema Migration
**Modify `db/database.ts`:**
- Bump `user_version` from current value to next
- Add migration: `ALTER TABLE exercises ADD COLUMN is_assisted INTEGER DEFAULT 0`
- Existing exercises unaffected (default 0)

**Modify `db/exercises.ts`:**
- Update `Exercise` interface to include `is_assisted: number`
- Update `insertCustomExercise()` signature to accept optional `isAssisted` boolean parameter

### Exercise Creation UI
**Modify `components/AddExerciseModal.tsx`** (or both `ExercisesContent.tsx` and `add-exercise.tsx` if not extracted in F3):
- Add an "Assisted" toggle switch below the equipment chips
- Label: "Assisted (e.g., pull-up machine)" — explains the purpose
- When toggled on, sets `is_assisted = 1` on insert
- Default off

### Workout UI
**Modify `store/useWorkoutStore.ts`:**
- `WorkoutExercise` interface: add `isAssisted: boolean` field
- When adding an exercise, look up `is_assisted` from the DB and store it

**Modify `components/SetRow.tsx`:**
- Accept new prop `isAssisted: boolean`
- When `isAssisted` is true, change the weight input label from "lbs" to "Assisted lbs" (or show a small "A" badge/indicator)
- The numeric input works the same way — just the label/context changes so the user knows they're logging assisted weight

**Modify `components/ExerciseCard.tsx`:**
- Pass `isAssisted` from the exercise data down to each `SetRow`

### Display
**Modify `app/workout/summary.tsx`:**
- When displaying sets for an assisted exercise, show "A 50 lbs × 8" or "50 lbs (assisted) × 8" instead of just "50 lbs × 8"

**Test**: Create a custom exercise with "Assisted" toggled on. Start a workout, add it, log sets with assisted weight. Complete workout — summary shows assisted indicator. Existing exercises unchanged.

---

## F5: Workout UX Improvements

**Goal**: Two small quality-of-life fixes for the active workout flow.

### Full Swipe to Delete Sets
**Modify `components/SetRow.tsx`:**
- Add `onSwipeableOpen` callback to the `Swipeable` component (fires when fully swiped open)
- When the right action is fully opened, auto-trigger deletion: call `onRemoveSet(localId)` with haptic feedback
- Set `overshootRight={true}` to allow the full swipe motion
- Keep the existing partial swipe → reveal delete button behavior for users who prefer that
- The `rightThreshold` can stay at 40 for the partial reveal; `onSwipeableOpen` handles the full swipe case

### Smart Finish Warning
**Modify `app/workout/[id].tsx`:**
- In `handleFinish()`, check if all sets in the store have `isComplete === true`
- If all complete (or no sets exist): skip the Alert, finish immediately
- If any incomplete: show the existing warning ("Incomplete sets will not be saved.")
- Access sets via `useWorkoutStore.getState().sets` and check `.isComplete` on each

**Test**:
1. Full swipe: Swipe a set row all the way left — set deletes automatically with haptic. Partial swipe still reveals delete button.
2. Smart finish: Complete all sets → tap Finish → goes straight to summary (no alert). Leave one set incomplete → tap Finish → warning appears as before.

---

## F6: Exercise History & Progression Screen

**Goal**: Tap an exercise in the Exercises tab to view its full performance history with progression indicators.

### New DB Query
**Modify `db/workouts.ts`:**
- Add `getExerciseHistory(exerciseId: number)` — returns all sets for this exercise across all finished workouts, joined with workout date:
  ```sql
  SELECT w.id as workout_id, w.started_at, s.set_order, s.weight, s.reps
  FROM sets s
  JOIN workouts w ON s.workout_id = w.id
  WHERE s.exercise_id = ? AND w.finished_at IS NOT NULL
  ORDER BY w.started_at DESC, s.set_order ASC
  ```
- Returns `ExerciseHistoryEntry[]` grouped by workout session

### New Screen
**Create `app/exercise/[id].tsx`:**
- Full-screen modal (or pushed screen) showing exercise history
- **Header**: Exercise name, muscle group badge, equipment tag
- **Stats summary**: Total sessions performed, estimated 1RM or best set (heaviest weight × reps), total volume all-time
- **History list**: `SectionList` grouped by workout date (most recent first)
  - Section header: date + total volume for that session
  - Rows: each set — "Set 1: 135 lbs × 10" format
  - **Progression indicator** per session: compare session's best set (max weight, or max volume = weight × reps) to the previous session
    - Green up arrow: improved (higher volume or weight)
    - Red down arrow: regressed
    - Gray dash: same
- Empty state: "No history yet — complete a workout with this exercise to see your progress."

### Navigation
**Modify `components/screens/ExercisesContent.tsx`:**
- Add `onPress` to `ExerciseListItem` that navigates to `/exercise/${exercise.id}`

**Modify `app/_layout.tsx`:**
- Register `exercise/[id]` route (presentation: `'modal'` or default push)

### Colors
**Modify `constants/colors.ts`:**
- Add `progressUp: '#22c55e'` (green — reuse existing `success` token)
- Add `progressDown: '#ef4444'` (red — reuse existing `error` token)
- Add `progressFlat: '#9ca3af'` (gray)

**Test**: Go to Exercises tab, tap any exercise. History screen opens showing all past performances grouped by date. Sessions with improvement show green arrow, regressions show red. Tap back to return to exercises list. Exercise with no history shows empty state.

---

## Dependency Order

```
F1 (floating timer) ──┐
F2 (press pulse)   ──┤
F5 (swipe + warn)  ──┼──> F3 (custom mid-workout) ──> F4 (assisted input) ──> F6 (history screen)
                      │
                      └── All independent except F3→F4 chain
```

After F6, resume Phase 2 at S6 (App Store Preparation).

---
---

# Phase 2: Testing & App Store Submission

## Context

All features and polish are complete. The app needs to go from "runs in Expo Go on dev machine" to "published on the iOS App Store." Since the project uses Expo managed workflow, EAS Build handles iOS compilation in the cloud — no Mac required. Apple Developer account ($99/year) is required from S4 onward.

## Progress

| Batch | Status | Description |
|-------|--------|-------------|
| S1 | Done | App Identity, Configuration & Dark Mode Shadows |
| S2 | Done | App Icon & Splash Screen |
| S3 | Done | EAS Build Setup |
| S4 | Done | Development Build (Physical Device) |
| S5 | Done | TestFlight Beta |
| S6 | Pending | App Store Preparation |
| S7 | Pending | Production Build & Submission |

## Dependency Chain

```
S1 (config) ──┐
S2 (assets) ──┼──> S3 (EAS setup) ──> S4 (dev build) ──> S5 (TestFlight) ──> S6 (store prep) ──> S7 (submit)
              │
              └── S4+ requires Apple Developer Account ($99/year)
```

S1 and S2 can be done in parallel. S3 requires a free Expo account. S4 onward requires Apple Developer account.

---

## S1: App Identity, Configuration & Dark Mode Shadows

**Goal**: Set bundle identifier, fix app.json metadata, create eas.json, install dev client dependency, and fix shadows for dark mode support.

**Prerequisites**: None.

### Changes

**Theme-aware shadows (`constants/shadows.ts`):**
- Converted `cardShadow` from static export to function taking `colors` parameter
- In dark mode returns empty styles (cards rely on bgCard/bg contrast instead)
- Updated 3 consumer files: `HomeContent.tsx`, `[id].tsx`, `summary.tsx` — `...cardShadow` → `...cardShadow(colors)`

**Modify `app.json`:**
- Change `"name": "proverload"` → `"name": "Provolone"` (capitalized display name)
- Keep `"userInterfaceStyle": "automatic"` (app supports both light and dark mode)
- Add to `expo.ios`: `bundleIdentifier: "app.provolone"`, `buildNumber: "1"`, `supportsTablet: false`
- Add `"expo-dev-client"` to plugins array

**Create `eas.json`** at project root with development/preview/production build profiles and placeholder submit config (filled in during S6).

**Install:** `npx expo install expo-dev-client`

**Decided:** Bundle ID = `app.provolone`, iPad support disabled (`supportsTablet: false`), dark mode kept (automatic theme switching).

**Test**: `npx expo start` still works. Toggle device dark mode — app switches themes, shadows hidden in dark mode. All screens render correctly in both themes.

---

## S2: App Icon & Splash Screen

**Goal**: Replace Expo placeholder assets with branded Provolone icon and splash screen.

**Prerequisites**: You need to create or commission icon artwork.

### Icon Specs

| File | Purpose | Size |
|------|---------|------|
| `assets/images/icon.png` | iOS app icon source | 1024x1024 px, PNG, no transparency, no rounded corners |
| `assets/images/adaptive-icon.png` | Android (future) | 1024x1024 px |
| `assets/images/favicon.png` | Web favicon | 48x48 px |
| `assets/images/splash-icon.png` | Splash screen logo | 200x200+ px (centered on background) |

Expo auto-generates all required iOS icon sizes from the single 1024x1024 `icon.png`.

### Design Suggestions

Given the brand (rose `#f43f5e`, white, dark text):
- **Icon**: Solid rose `#f43f5e` background, white barbell/dumbbell silhouette or stylized "P". Keep it simple — must be recognizable at 29x29.
- **Tools**: Figma (free), icon.kitchen (free web tool), or Canva (has app icon templates)

### Splash Screen Config

**Modify `app.json`** splash section:
```json
"splash": {
  "image": "./assets/images/splash-icon.png",
  "resizeMode": "contain",
  "backgroundColor": "#f43f5e"
}
```
Rose background + white logo creates a strong brand moment on launch.

### Asset Replacement

Replace the 4 files listed above with your new designs. Just overwrite the existing files — same filenames.

**What was done:** Splash `backgroundColor` set to `#f43f5e` in app.json. All 4 placeholder assets replaced with programmatically generated white barbell on rose background (icon, adaptive-icon, favicon) and white barbell on transparent (splash-icon). Generated via temporary Node.js script using `sharp` (script + dependency removed after generation).

**Test**: App launches with new splash (rose background, white logo). Icon appears correctly on home screen and in Expo Go app list. No white fringing or transparency artifacts.

---

## S3: EAS Build Setup

**Goal**: Install EAS CLI, log in, verify project is linked to your Expo account.

**Prerequisites**: Free Expo account (create at expo.dev).

### Commands

```bash
npm install -g eas-cli
eas login
eas build:configure
```

`eas build:configure` validates your `eas.json` and links the project to your Expo account.

### Verify

```bash
eas whoami          # shows your Expo username
eas config --platform ios   # shows build profiles + bundle ID
```

**Test**: All three commands succeed without errors. `eas config` shows development/preview/production profiles.

---

## S4: Development Build (Physical Device)

**Goal**: Create a dev build that runs on a physical iPhone, replacing Expo Go. Confirms all native modules (expo-sqlite, expo-haptics, reanimated) work in a real build.

**Prerequisites**:
- **Apple Developer account** ($99/year) — sign up at developer.apple.com. Allow 24-48 hours for activation.
- EAS CLI configured (S3)
- Physical iPhone available

### Steps

**1. Register your device:**
```bash
eas device:create
```
Opens a URL — open it on your iPhone to install a provisioning profile.

**2. Build:**
```bash
eas build --profile development --platform ios
```
Runs in the cloud, ~10-20 minutes. EAS creates signing credentials automatically.

**3. Install & test:**
- Scan QR code or open download link on iPhone
- Dev client connects to your local dev server: `npx expo start --dev-client`
- Test all core flows end-to-end

### Test Checklist
- [ ] App installs on device
- [ ] expo-sqlite works (data persists between restarts)
- [ ] expo-haptics fires on set completion
- [ ] Reanimated animations run on native thread (smooth, not janky)
- [ ] Splash screen displays correctly
- [ ] App icon on home screen is correct
- [ ] Keyboard behavior works (KeyboardAvoidingView, numeric pad)

---

## S5: TestFlight Beta

**Goal**: Build a production-signed app, upload to TestFlight, test the "real" App Store build.

**Prerequisites**: S4 completed (native modules verified), Apple Developer account active.

### Steps

**1. Build production archive:**
```bash
eas build --profile production --platform ios
```

**2. Upload to TestFlight:**
```bash
eas submit --platform ios --latest
```
First time: EAS will create the app in App Store Connect if it doesn't exist. Say yes.

**3. TestFlight testing:**
- Build appears in TestFlight after Apple's processing (5-30 minutes)
- Install from TestFlight on your iPhone
- Test as a "real user" — cold launch, all flows, edge cases

### Test Checklist
- [ ] Build uploads without errors
- [ ] Build passes TestFlight automated processing (no crashes)
- [ ] App installs from TestFlight
- [ ] All features identical to dev build
- [ ] No entitlement warnings in App Store Connect
- [ ] Launch time is acceptable (< 2 seconds)

---

## S6: App Store Preparation

**Goal**: Create all required listing assets — privacy policy, screenshots, metadata, App Store Connect configuration.

**Prerequisites**: App exists in App Store Connect (created during S5), TestFlight build tested.

### S6.1: Privacy Policy

Host a simple privacy policy page (Provolone collects zero data):

> **Privacy Policy for Provolone**
>
> Provolone is an offline workout tracker. All workout data is stored locally on your device using SQLite and never leaves your device. Provolone does not collect, transmit, or share any personal data. No third-party analytics, advertising, or tracking services are used. Delete all data by uninstalling the app.
>
> Contact: [your email]

**Hosting options** (free): GitHub Pages, Notion public page, any static host.

### S6.2: App Store Connect Metadata

| Field | Value |
|-------|-------|
| App Name | Provolone |
| Subtitle | Progressive Overload Tracker |
| Category | Health & Fitness |
| Age Rating | 4+ |
| Price | Free |
| Copyright | 2026 [Your Name] |
| Privacy Policy URL | [your hosted URL] |

### S6.3: App Description

```
Provolone tracks your gym workouts so you always know what to beat next time.

- Log sets, reps, and weight for every exercise
- See your last performance while you train
- Workout templates for your favorite routines
- Full exercise library organized by muscle group
- Create custom exercises and templates
- View complete workout history

All data stays on your device. No accounts, no cloud, no subscriptions.
```

**Keywords** (100 char max):
`workout,tracker,gym,progressive,overload,strength,training,lifting,weightlifting,fitness,log,sets`

### S6.4: Screenshots

**Required**: 6.7" display (iPhone 15/16 Pro Max). **Recommended**: 6.1" display too.

**Capture 5 screenshots:**
1. Home screen — Start Workout button + recent sessions
2. Active workout — sets being logged with "last performance" visible
3. Exercise library — muscle group filter chips active
4. Workout history — list of past sessions
5. Workout summary — post-workout stats

**How**: Screenshot from TestFlight on device, or use Figma/screenshots.pro for device mockup frames.

### S6.5: App Privacy Declaration

In App Store Connect → App Privacy → select **"Data Not Collected"**. This is accurate — Provolone is fully offline.

### S6.6: Update `eas.json` with real credentials

Fill in the submit placeholders:
- `appleId`: Your Apple ID email
- `ascAppId`: Found in App Store Connect → App Information → Apple ID (numeric)
- `appleTeamId`: Found at developer.apple.com → Membership → Team ID

### S6.7: Review Notes (optional)

```
Provolone is an offline workout tracker. No login required.
Tap "Start Workout" to begin. Add exercises, log sets, and complete the workout.
```

**Test**: Privacy policy URL is live. All App Store Connect fields filled (no red warnings). Screenshots uploaded. App Privacy completed.

---

## S7: Production Build & Submission

**Goal**: Submit the final build to Apple for review.

**Prerequisites**: All S6 metadata complete, TestFlight testing passed, privacy policy live.

### Pre-submission checklist

Verify in `app.json`:
- [ ] `name` is "Provolone"
- [ ] `version` is "1.0.0"
- [ ] `ios.bundleIdentifier` is set
- [ ] `userInterfaceStyle` is "light"
- [ ] `icon` points to real 1024x1024 icon
- [ ] `splash` configured with branded assets

### Build & submit

```bash
eas build --profile production --platform ios
eas submit --platform ios --latest
```

### Submit for Review

1. Go to appstoreconnect.apple.com
2. Select Provolone → your new version
3. Select the uploaded build
4. Click **"Submit for Review"**

### Review Timeline
- First submissions: typically 24-48 hours
- Common rejection reasons: missing screenshot sizes, broken privacy policy link, crash on launch
- If rejected: read the reason, fix it, bump `buildNumber`, rebuild, resubmit

**Test**: Build uploads without errors. App Store Connect shows "Ready for Review" → "In Review" → **"Ready for Sale"**.

---

## Quick Command Reference

```bash
# S1: Install dev client
npx expo install expo-dev-client

# S3: EAS setup
npm install -g eas-cli
eas login
eas build:configure

# S4: Dev build for device
eas device:create
eas build --profile development --platform ios

# S5: TestFlight
eas build --profile production --platform ios
eas submit --platform ios --latest

# S7: Production submission (same commands as S5)
eas build --profile production --platform ios
eas submit --platform ios --latest
```

---

## Known Issues to Resolve

1. **`userInterfaceStyle: "automatic"`** — must change to `"light"` (S1)
2. **Dead dark mode code in `colors.ts`** — harmless but cleanup recommended (S1)
3. **`supportsTablet`** — will be set to `false` (iPhone only) (S1)
4. **App name lowercase** — `"proverload"` should be `"Provolone"` (S1)
