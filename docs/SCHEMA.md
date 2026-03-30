# Database Schema & Seed Data

## Schema

All tables live in a single SQLite database initialized via `expo-sqlite`. Foreign keys must be enabled on every connection (`PRAGMA foreign_keys = ON`).

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
  weight      REAL,
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

## Allowed Values

- `muscle_group`: Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Core, Calves
- `equipment`: Barbell, Dumbbell, Cable, Machine, Bodyweight
- `weight`: stored in lbs (REAL to allow 2.5 lb increments). NULL means bodyweight.

## Key Query: "Last Performance"

This is the most important query in the app. For a given exercise, fetch the sets from the most recent completed workout that included it:

```sql
SELECT s.set_order, s.weight, s.reps
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE s.exercise_id = ?
  AND w.finished_at IS NOT NULL
  AND w.id != ?  -- exclude the current workout
ORDER BY w.started_at DESC, s.set_order ASC
LIMIT 20;
```

Group the results by workout (take only the first workout's sets) in application code, then format as "Last: 3×8 @ 185 lbs".

## Seed Exercises

Seed ~60-80 exercises on first launch. See the full list below. Each row is `(name, muscle_group, equipment)`:

**Chest:** Barbell Bench Press (Barbell), Incline Barbell Bench Press (Barbell), Dumbbell Bench Press (Dumbbell), Incline Dumbbell Press (Dumbbell), Cable Fly (Cable), Dumbbell Fly (Dumbbell), Machine Chest Press (Machine), Push-Up (Bodyweight), Dip (Bodyweight)

**Back:** Barbell Bent-Over Row (Barbell), Barbell Deadlift (Barbell), Lat Pulldown (Cable), Seated Cable Row (Cable), Dumbbell Row (Dumbbell), T-Bar Row (Barbell), Pull-Up (Bodyweight), Chin-Up (Bodyweight), Cable Face Pull (Cable)

**Shoulders:** Dumbbell Shoulder Press (Dumbbell), Barbell Overhead Press (Barbell), Cable Lateral Raise (Cable), Dumbbell Lateral Raise (Dumbbell), Dumbbell Front Raise (Dumbbell), Reverse Dumbbell Fly (Dumbbell), Machine Shoulder Press (Machine)

**Biceps:** Barbell Curl (Barbell), Dumbbell Curl (Dumbbell), Hammer Curl (Dumbbell), Preacher Curl (Barbell), Cable Curl (Cable), Incline Dumbbell Curl (Dumbbell), Concentration Curl (Dumbbell)

**Triceps:** Tricep Pushdown (Cable), Overhead Tricep Extension (Cable), Skull Crusher (Barbell), Close-Grip Bench Press (Barbell), Dumbbell Tricep Kickback (Dumbbell), Tricep Dip (Bodyweight)

**Quads:** Barbell Back Squat (Barbell), Barbell Front Squat (Barbell), Leg Press (Machine), Leg Extension (Machine), Bulgarian Split Squat (Dumbbell), Goblet Squat (Dumbbell), Hack Squat (Machine), Lunge (Dumbbell)

**Hamstrings:** Romanian Deadlift (Barbell), Leg Curl (Machine), Seated Leg Curl (Machine), Stiff-Leg Deadlift (Barbell), Nordic Hamstring Curl (Bodyweight), Dumbbell Romanian Deadlift (Dumbbell)

**Glutes:** Hip Thrust (Barbell), Cable Pull-Through (Cable), Glute Bridge (Bodyweight), Cable Kickback (Cable)

**Core:** Plank (Bodyweight), Hanging Leg Raise (Bodyweight), Cable Crunch (Cable), Ab Wheel Rollout (Bodyweight), Russian Twist (Bodyweight), Decline Sit-Up (Bodyweight)

**Calves:** Standing Calf Raise (Machine), Seated Calf Raise (Machine), Smith Machine Calf Raise (Machine)

## Seed Templates

Insert after seeding exercises. Look up exercise IDs by name.

| Template | Exercises (in order) | Sets × Reps |
|---|---|---|
| Push Day | Barbell Bench Press, Incline Dumbbell Press, Dumbbell Shoulder Press, Cable Lateral Raise, Tricep Pushdown, Overhead Tricep Extension | 4×8, 3×10, 3×10, 3×15, 3×12, 3×12 |
| Pull Day | Barbell Deadlift, Barbell Bent-Over Row, Lat Pulldown, Cable Face Pull, Barbell Curl, Hammer Curl | 3×5, 4×8, 3×10, 3×15, 3×10, 3×12 |
| Leg Day | Barbell Back Squat, Romanian Deadlift, Leg Press, Leg Curl, Leg Extension, Standing Calf Raise | 4×6, 3×10, 3×12, 3×12, 3×12, 4×15 |
| Upper Body | Barbell Bench Press, Barbell Bent-Over Row, Dumbbell Shoulder Press, Lat Pulldown, Barbell Curl, Tricep Pushdown | 4×8, 4×8, 3×10, 3×10, 3×10, 3×12 |
| Lower Body | Barbell Back Squat, Romanian Deadlift, Bulgarian Split Squat, Leg Curl, Leg Extension, Standing Calf Raise | 4×6, 3×10, 3×10, 3×12, 3×12, 4×15 |
