# Proverload — MVP Scope

## Overview

**Proverload** (progressive + overload) is a dead-simple mobile app for tracking gym workouts. At its core, the app does one thing well: **log sets, reps, and weight** so you always know what to beat next session. Everything else is secondary and built on top of that foundation.

**Target user:** Personal use (single user, no auth)
**Platform:** iOS & Android via React Native + Expo
**Storage:** SQLite via `expo-sqlite`
**Default units:** lbs
**Scope level:** MVP — usable within 2–3 weeks of focused development
**Design philosophy:** Simplicity first. If a feature doesn't help you log faster or see what to lift next, it can wait.

---

## Core Feature Set (MVP)

### The Core — Exercise Logging

This is the app. Everything else supports this.

**Functionality:**
- Start a new workout session (auto-timestamps start/end)
- Add exercises from a local exercise library
- For each exercise, log sets: **weight (lbs)** and **reps**
- Mark sets as completed with a single tap
- Duplicate the previous set's values for quick entry
- Show the user's **last performance** inline (e.g., "Last: 3×8 @ 185 lbs") so you know what to beat
- Support bodyweight exercises (weight field optional)
- Swipe-to-delete or edit a set

**UX notes:**
- Large tap targets — designed for sweaty hands
- Minimal taps to log a set (weight + reps + tap "done")
- Numeric keypad input, no dropdowns
- Zero friction — the app should feel faster than a notes app

### Nice-to-Haves (MVP if time allows)

These enhance the core but are **not blockers** for a usable app. Build in this order if time permits:

**Tier A — High value, low effort:**
- Workout templates (save a workout, start from it next time)
- Rest timer (auto-start on set complete, configurable, haptic alert)

**Tier B — Valuable but can ship without:**
- Per-exercise progress chart (estimated 1RM over time)
- PR detection (notify when you hit a new best)
- Workout history list (scrollable log of past sessions)

---

## Exercise Library

A local, pre-seeded SQLite database of common exercises (~60–80) to avoid manual entry.

- Organized by **muscle group** (Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Core, Calves)
- Tagged by **equipment** (Barbell, Dumbbell, Cable, Machine, Bodyweight)
- Users can add custom exercises (name + muscle group)

---

## Data Model (SQLite Schema)

```sql
CREATE TABLE exercises (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  muscle_group  TEXT NOT NULL,
  equipment     TEXT DEFAULT 'Barbell',
  is_custom     INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE workouts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT,
  started_at  TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  template_id INTEGER REFERENCES templates(id)
);

CREATE TABLE sets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id  INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  set_order   INTEGER NOT NULL,
  weight      REAL,                   -- in lbs
  reps        INTEGER,
  is_complete INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE templates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE template_exercises (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  sort_order  INTEGER NOT NULL,
  default_sets INTEGER DEFAULT 3,
  default_reps INTEGER DEFAULT 8
);

CREATE INDEX idx_sets_workout ON sets(workout_id);
CREATE INDEX idx_sets_exercise ON sets(exercise_id);
CREATE INDEX idx_workouts_started ON workouts(started_at);
```

---

## Screen Breakdown

### Tab 1: Home
- Quick-start workout button (blank or from template)
- List of recent workouts (last 5)
- "Start from template" option if templates exist

### Tab 2: Active Workout (full-screen, modal)
- List of exercises added to the session
- Set rows per exercise: weight / reps / complete button
- "Last time" reference shown per exercise
- Finish workout button → back to home

### Tab 3: History
- Scrollable list of past workouts by date
- Tap to view full workout detail

### Tab 4: Exercises
- Searchable exercise library
- Add custom exercise (name + muscle group)

---

## UI / Design Direction

- **Light mode** — clean, minimal, no visual clutter
- Color palette:
  - Background: white (#ffffff), card surfaces (#f9fafb)
  - Accent / primary: Rose #f43f5e
  - Accent shades: light (#ffe4e6), medium (#fb7185), dark (#e11d48)
  - Text: #111827 (primary), #6b7280 (secondary)
- Typography: Bold numbers for weight/reps, clean sans-serif (Inter or System)
- **Branding:** "Proverload" — own identity, no Klero association
- Large touch targets (minimum 48px), generous padding
- Haptic feedback on set completion
- No unnecessary animations — speed of logging is everything

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native + Expo (managed workflow) |
| Navigation | Expo Router (file-based) |
| Storage | `expo-sqlite` |
| State mgmt | Zustand |
| Haptics | `expo-haptics` |
| Charts | `victory-native` (post-MVP) |

---

## Development Phases

### Phase 1 — Foundation (Days 1–3)
- Expo project scaffold with Expo Router
- SQLite setup, seed exercise library
- Exercise library screen with search

### Phase 2 — Workout Logging (Days 4–8)
- Active workout screen — the full set logging UX
- "Last time" data per exercise
- Finish workout flow
- This is the app. Don't move on until this feels great.

### Phase 3 — History + Templates (Days 9–11)
- Workout history list and detail view
- Save workout as template / start from template

### Phase 4 — Polish (Days 12–14)
- Light mode theming pass (rose accent throughout)
- Haptics on set complete
- Rest timer (if time allows)
- Edge cases and QA

---

## Out of Scope (Post-MVP)

- Cloud sync / backup
- Progress charts and PR detection
- RPE tracking
- Social features / sharing
- Body measurements and weight tracking
- Superset / dropset / circuit set types
- Exercise demo videos or images
- Data export (CSV/JSON)
- Wearable integration
- Plate calculator
- Workout scheduling / calendar view
- Muscle group volume analytics
- Dark mode (can add later as a toggle)
- Unit toggle (kg) — lbs only for now

---

## Seed Templates

Pre-loaded templates based on a PPL + Upper/Lower hybrid split:

### Push Day
1. Barbell Bench Press — 4×8
2. Incline Dumbbell Press — 3×10
3. Dumbbell Shoulder Press — 3×10
4. Cable Lateral Raise — 3×15
5. Tricep Pushdown — 3×12
6. Overhead Tricep Extension — 3×12

### Pull Day
1. Barbell Deadlift — 3×5
2. Barbell Bent-Over Row — 4×8
3. Lat Pulldown — 3×10
4. Cable Face Pull — 3×15
5. Barbell Curl — 3×10
6. Hammer Curl — 3×12

### Leg Day
1. Barbell Back Squat — 4×6
2. Romanian Deadlift — 3×10
3. Leg Press — 3×12
4. Leg Curl — 3×12
5. Leg Extension — 3×12
6. Standing Calf Raise — 4×15

### Upper Body
1. Barbell Bench Press — 4×8
2. Barbell Bent-Over Row — 4×8
3. Dumbbell Shoulder Press — 3×10
4. Lat Pulldown — 3×10
5. Barbell Curl — 3×10
6. Tricep Pushdown — 3×12

### Lower Body
1. Barbell Back Squat — 4×6
2. Romanian Deadlift — 3×10
3. Bulgarian Split Squat — 3×10
4. Leg Curl — 3×12
5. Leg Extension — 3×12
6. Standing Calf Raise — 4×15
