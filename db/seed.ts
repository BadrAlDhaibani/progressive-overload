import type { SQLiteDatabase } from 'expo-sqlite';

type ExerciseTuple = [name: string, muscleGroup: string, equipment: string];

const exercises: ExerciseTuple[] = [
  // Chest
  ['Barbell Bench Press', 'Chest', 'Barbell'],
  ['Incline Barbell Bench Press', 'Chest', 'Barbell'],
  ['Dumbbell Bench Press', 'Chest', 'Dumbbell'],
  ['Incline Dumbbell Press', 'Chest', 'Dumbbell'],
  ['Cable Fly', 'Chest', 'Cable'],
  ['Dumbbell Fly', 'Chest', 'Dumbbell'],
  ['Machine Chest Press', 'Chest', 'Machine'],
  ['Push-Up', 'Chest', 'Bodyweight'],
  ['Dip', 'Chest', 'Bodyweight'],

  // Back
  ['Barbell Bent-Over Row', 'Back', 'Barbell'],
  ['Barbell Deadlift', 'Back', 'Barbell'],
  ['Lat Pulldown', 'Back', 'Cable'],
  ['Seated Cable Row', 'Back', 'Cable'],
  ['Dumbbell Row', 'Back', 'Dumbbell'],
  ['T-Bar Row', 'Back', 'Barbell'],
  ['Pull-Up', 'Back', 'Bodyweight'],
  ['Chin-Up', 'Back', 'Bodyweight'],
  ['Cable Face Pull', 'Back', 'Cable'],

  // Shoulders
  ['Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell'],
  ['Barbell Overhead Press', 'Shoulders', 'Barbell'],
  ['Cable Lateral Raise', 'Shoulders', 'Cable'],
  ['Dumbbell Lateral Raise', 'Shoulders', 'Dumbbell'],
  ['Dumbbell Front Raise', 'Shoulders', 'Dumbbell'],
  ['Reverse Dumbbell Fly', 'Shoulders', 'Dumbbell'],
  ['Machine Shoulder Press', 'Shoulders', 'Machine'],

  // Biceps
  ['Barbell Curl', 'Biceps', 'Barbell'],
  ['Dumbbell Curl', 'Biceps', 'Dumbbell'],
  ['Hammer Curl', 'Biceps', 'Dumbbell'],
  ['Preacher Curl', 'Biceps', 'Barbell'],
  ['Cable Curl', 'Biceps', 'Cable'],
  ['Incline Dumbbell Curl', 'Biceps', 'Dumbbell'],
  ['Concentration Curl', 'Biceps', 'Dumbbell'],

  // Triceps
  ['Tricep Pushdown', 'Triceps', 'Cable'],
  ['Overhead Tricep Extension', 'Triceps', 'Cable'],
  ['Skull Crusher', 'Triceps', 'Barbell'],
  ['Close-Grip Bench Press', 'Triceps', 'Barbell'],
  ['Dumbbell Tricep Kickback', 'Triceps', 'Dumbbell'],
  ['Tricep Dip', 'Triceps', 'Bodyweight'],

  // Quads
  ['Barbell Back Squat', 'Quads', 'Barbell'],
  ['Barbell Front Squat', 'Quads', 'Barbell'],
  ['Leg Press', 'Quads', 'Machine'],
  ['Leg Extension', 'Quads', 'Machine'],
  ['Bulgarian Split Squat', 'Quads', 'Dumbbell'],
  ['Goblet Squat', 'Quads', 'Dumbbell'],
  ['Hack Squat', 'Quads', 'Machine'],
  ['Lunge', 'Quads', 'Dumbbell'],

  // Hamstrings
  ['Romanian Deadlift', 'Hamstrings', 'Barbell'],
  ['Leg Curl', 'Hamstrings', 'Machine'],
  ['Seated Leg Curl', 'Hamstrings', 'Machine'],
  ['Stiff-Leg Deadlift', 'Hamstrings', 'Barbell'],
  ['Nordic Hamstring Curl', 'Hamstrings', 'Bodyweight'],
  ['Dumbbell Romanian Deadlift', 'Hamstrings', 'Dumbbell'],

  // Glutes
  ['Hip Thrust', 'Glutes', 'Barbell'],
  ['Cable Pull-Through', 'Glutes', 'Cable'],
  ['Glute Bridge', 'Glutes', 'Bodyweight'],
  ['Cable Kickback', 'Glutes', 'Cable'],

  // Core
  ['Plank', 'Core', 'Bodyweight'],
  ['Hanging Leg Raise', 'Core', 'Bodyweight'],
  ['Cable Crunch', 'Core', 'Cable'],
  ['Ab Wheel Rollout', 'Core', 'Bodyweight'],
  ['Russian Twist', 'Core', 'Bodyweight'],
  ['Decline Sit-Up', 'Core', 'Bodyweight'],

  // Calves
  ['Standing Calf Raise', 'Calves', 'Machine'],
  ['Seated Calf Raise', 'Calves', 'Machine'],
  ['Smith Machine Calf Raise', 'Calves', 'Machine'],
];

interface TemplateData {
  name: string;
  exercises: { name: string; sets: number; reps: number }[];
}

const templates: TemplateData[] = [
  {
    name: 'Push Day',
    exercises: [
      { name: 'Barbell Bench Press', sets: 4, reps: 8 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 10 },
      { name: 'Dumbbell Shoulder Press', sets: 3, reps: 10 },
      { name: 'Cable Lateral Raise', sets: 3, reps: 15 },
      { name: 'Tricep Pushdown', sets: 3, reps: 12 },
      { name: 'Overhead Tricep Extension', sets: 3, reps: 12 },
    ],
  },
  {
    name: 'Pull Day',
    exercises: [
      { name: 'Barbell Deadlift', sets: 3, reps: 5 },
      { name: 'Barbell Bent-Over Row', sets: 4, reps: 8 },
      { name: 'Lat Pulldown', sets: 3, reps: 10 },
      { name: 'Cable Face Pull', sets: 3, reps: 15 },
      { name: 'Barbell Curl', sets: 3, reps: 10 },
      { name: 'Hammer Curl', sets: 3, reps: 12 },
    ],
  },
  {
    name: 'Leg Day',
    exercises: [
      { name: 'Barbell Back Squat', sets: 4, reps: 6 },
      { name: 'Romanian Deadlift', sets: 3, reps: 10 },
      { name: 'Leg Press', sets: 3, reps: 12 },
      { name: 'Leg Curl', sets: 3, reps: 12 },
      { name: 'Leg Extension', sets: 3, reps: 12 },
      { name: 'Standing Calf Raise', sets: 4, reps: 15 },
    ],
  },
  {
    name: 'Upper Body',
    exercises: [
      { name: 'Barbell Bench Press', sets: 4, reps: 8 },
      { name: 'Barbell Bent-Over Row', sets: 4, reps: 8 },
      { name: 'Dumbbell Shoulder Press', sets: 3, reps: 10 },
      { name: 'Lat Pulldown', sets: 3, reps: 10 },
      { name: 'Barbell Curl', sets: 3, reps: 10 },
      { name: 'Tricep Pushdown', sets: 3, reps: 12 },
    ],
  },
  {
    name: 'Lower Body',
    exercises: [
      { name: 'Barbell Back Squat', sets: 4, reps: 6 },
      { name: 'Romanian Deadlift', sets: 3, reps: 10 },
      { name: 'Bulgarian Split Squat', sets: 3, reps: 10 },
      { name: 'Leg Curl', sets: 3, reps: 12 },
      { name: 'Leg Extension', sets: 3, reps: 12 },
      { name: 'Standing Calf Raise', sets: 4, reps: 15 },
    ],
  },
];

function getExerciseId(database: SQLiteDatabase, name: string): number {
  const row = database.getFirstSync<{ id: number }>(
    'SELECT id FROM exercises WHERE name = ?',
    name
  );
  if (!row) {
    throw new Error(`Seed error: exercise "${name}" not found. Check for typos in template data.`);
  }
  return row.id;
}

export function seedDatabase(database: SQLiteDatabase): void {
  for (const [name, muscleGroup, equipment] of exercises) {
    database.runSync(
      'INSERT INTO exercises (name, muscle_group, equipment) VALUES (?, ?, ?)',
      name,
      muscleGroup,
      equipment
    );
  }

  for (const template of templates) {
    const result = database.runSync(
      'INSERT INTO templates (name) VALUES (?)',
      template.name
    );
    const templateId = result.lastInsertRowId;

    for (let i = 0; i < template.exercises.length; i++) {
      const ex = template.exercises[i];
      const exerciseId = getExerciseId(database, ex.name);
      database.runSync(
        'INSERT INTO template_exercises (template_id, exercise_id, sort_order, default_sets, default_reps) VALUES (?, ?, ?, ?, ?)',
        templateId,
        exerciseId,
        i + 1,
        ex.sets,
        ex.reps
      );
    }
  }
}
