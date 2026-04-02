import { db } from './database';

export interface Workout {
  id: number;
  name: string | null;
  started_at: string;
  finished_at: string | null;
  template_id: number | null;
}

export interface WorkoutSet {
  id: number;
  workout_id: number;
  exercise_id: number;
  set_order: number;
  weight: number | null;
  reps: number | null;
  is_complete: number;
  created_at: string;
}

export interface WorkoutSetWithExercise extends WorkoutSet {
  exercise_name: string;
  muscle_group: string;
}

export interface LastPerformanceSet {
  set_order: number;
  weight: number | null;
  reps: number | null;
}

export function createWorkout(name?: string): number {
  const result = db.runSync(
    'INSERT INTO workouts (name) VALUES (?)',
    name ?? null
  );
  return result.lastInsertRowId;
}

export function finishWorkout(id: number): void {
  db.runSync(
    "UPDATE workouts SET finished_at = datetime('now') WHERE id = ?",
    id
  );
}

export function deleteWorkout(id: number): void {
  db.runSync('DELETE FROM workouts WHERE id = ?', id);
}

export function getRecentWorkouts(limit: number): Workout[] {
  return db.getAllSync<Workout>(
    'SELECT * FROM workouts WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT ?',
    limit
  );
}

export function getWorkoutById(id: number): Workout | null {
  return db.getFirstSync<Workout>(
    'SELECT * FROM workouts WHERE id = ?',
    id
  );
}

export function insertSet(
  workoutId: number,
  exerciseId: number,
  setOrder: number,
  weight: number | null,
  reps: number | null
): number {
  const result = db.runSync(
    'INSERT INTO sets (workout_id, exercise_id, set_order, weight, reps) VALUES (?, ?, ?, ?, ?)',
    workoutId,
    exerciseId,
    setOrder,
    weight,
    reps
  );
  return result.lastInsertRowId;
}

export function updateSet(
  id: number,
  weight: number | null,
  reps: number | null,
  isComplete: number
): void {
  db.runSync(
    'UPDATE sets SET weight = ?, reps = ?, is_complete = ? WHERE id = ?',
    weight,
    reps,
    isComplete,
    id
  );
}

export function deleteSet(id: number): void {
  db.runSync('DELETE FROM sets WHERE id = ?', id);
}

export function getWorkoutSets(workoutId: number): WorkoutSetWithExercise[] {
  return db.getAllSync<WorkoutSetWithExercise>(
    `SELECT s.*, e.name AS exercise_name, e.muscle_group
     FROM sets s
     JOIN exercises e ON s.exercise_id = e.id
     WHERE s.workout_id = ?
     ORDER BY s.exercise_id, s.set_order`,
    workoutId
  );
}

export function getLastPerformance(
  exerciseId: number,
  currentWorkoutId: number
): LastPerformanceSet[] {
  const rows = db.getAllSync<LastPerformanceSet & { workout_id: number }>(
    `SELECT s.set_order, s.weight, s.reps, w.id AS workout_id
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE s.exercise_id = ?
       AND w.finished_at IS NOT NULL
       AND w.id != ?
     ORDER BY w.started_at DESC, s.set_order ASC
     LIMIT 20`,
    exerciseId,
    currentWorkoutId
  );

  if (rows.length === 0) return [];

  const targetWorkoutId = rows[0].workout_id;
  return rows
    .filter((r) => r.workout_id === targetWorkoutId)
    .map(({ set_order, weight, reps }) => ({ set_order, weight, reps }));
}
