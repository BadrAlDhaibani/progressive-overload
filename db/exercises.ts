import { db } from './database';

export interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
  is_custom: number;
  is_assisted: number;
  created_at: string;
}

export function getAllExercises(): Exercise[] {
  return db.getAllSync<Exercise>('SELECT * FROM exercises ORDER BY name');
}

export function getExerciseById(id: number): Exercise | null {
  return db.getFirstSync<Exercise>('SELECT * FROM exercises WHERE id = ?', id);
}

export function getExercisesByMuscleGroup(group: string): Exercise[] {
  return db.getAllSync<Exercise>(
    'SELECT * FROM exercises WHERE muscle_group = ? ORDER BY name',
    group
  );
}

export function searchExercises(query: string): Exercise[] {
  return db.getAllSync<Exercise>(
    'SELECT * FROM exercises WHERE name LIKE ? ORDER BY name',
    '%' + query + '%'
  );
}

export function insertCustomExercise(
  name: string,
  muscleGroup: string,
  equipment: string,
  isAssisted = false
): number {
  const result = db.runSync(
    'INSERT INTO exercises (name, muscle_group, equipment, is_custom, is_assisted) VALUES (?, ?, ?, 1, ?)',
    name,
    muscleGroup,
    equipment,
    isAssisted ? 1 : 0
  );
  return result.lastInsertRowId;
}

export interface ExerciseUsage {
  setsCount: number;
  workoutsCount: number;
  templatesCount: number;
}

export function getExerciseUsage(id: number): ExerciseUsage {
  const sets = db.getFirstSync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM sets WHERE exercise_id = ?',
    id
  );
  const workouts = db.getFirstSync<{ c: number }>(
    'SELECT COUNT(DISTINCT workout_id) AS c FROM sets WHERE exercise_id = ?',
    id
  );
  const templates = db.getFirstSync<{ c: number }>(
    'SELECT COUNT(DISTINCT template_id) AS c FROM template_exercises WHERE exercise_id = ?',
    id
  );
  return {
    setsCount: sets?.c ?? 0,
    workoutsCount: workouts?.c ?? 0,
    templatesCount: templates?.c ?? 0,
  };
}

export function deleteExercise(id: number): void {
  const affectedWorkouts = db.getAllSync<{ workout_id: number }>(
    'SELECT DISTINCT workout_id FROM sets WHERE exercise_id = ?',
    id
  );
  const affectedTemplates = db.getAllSync<{ template_id: number }>(
    'SELECT DISTINCT template_id FROM template_exercises WHERE exercise_id = ?',
    id
  );

  db.execSync('BEGIN');
  try {
    db.runSync('DELETE FROM sets WHERE exercise_id = ?', id);
    db.runSync('DELETE FROM template_exercises WHERE exercise_id = ?', id);

    for (const { workout_id } of affectedWorkouts) {
      const remaining = db.getFirstSync<{ one: number }>(
        'SELECT 1 AS one FROM sets WHERE workout_id = ? LIMIT 1',
        workout_id
      );
      if (!remaining) {
        db.runSync('DELETE FROM workouts WHERE id = ?', workout_id);
      }
    }

    for (const { template_id } of affectedTemplates) {
      const remaining = db.getFirstSync<{ one: number }>(
        'SELECT 1 AS one FROM template_exercises WHERE template_id = ? LIMIT 1',
        template_id
      );
      if (!remaining) {
        db.runSync('UPDATE workouts SET template_id = NULL WHERE template_id = ?', template_id);
        db.runSync('DELETE FROM templates WHERE id = ?', template_id);
      }
    }

    db.runSync('DELETE FROM exercises WHERE id = ?', id);
    db.execSync('COMMIT');
  } catch (e) {
    db.execSync('ROLLBACK');
    throw e;
  }
}
