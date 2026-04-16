export const equipmentOptions = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight'] as const;

export type Equipment = (typeof equipmentOptions)[number];
