export const muscleGroups = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Core',
  'Calves',
] as const;

export type MuscleGroup = (typeof muscleGroups)[number];
