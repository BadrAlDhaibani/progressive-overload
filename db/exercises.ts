import { db } from './database';

export interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
  is_custom: number;
  created_at: string;
}

export function getAllExercises(): Exercise[] {
  return db.getAllSync<Exercise>('SELECT * FROM exercises ORDER BY name');
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
  equipment: string
): number {
  const result = db.runSync(
    'INSERT INTO exercises (name, muscle_group, equipment, is_custom) VALUES (?, ?, ?, 1)',
    name,
    muscleGroup,
    equipment
  );
  return result.lastInsertRowId;
}
