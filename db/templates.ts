import { db } from './database';

export interface Template {
  id: number;
  name: string;
  created_at: string;
}

export interface TemplateExercise {
  exercise_id: number;
  exercise_name: string;
  muscle_group: string;
  equipment: string;
  sort_order: number;
  default_sets: number;
  default_reps: number;
}

export function getAllTemplates(): Template[] {
  return db.getAllSync<Template>('SELECT * FROM templates ORDER BY name');
}

export function getTemplateWithExercises(templateId: number): {
  template: Template;
  exercises: TemplateExercise[];
} | null {
  const template = db.getFirstSync<Template>(
    'SELECT * FROM templates WHERE id = ?',
    templateId
  );
  if (!template) return null;

  const exercises = db.getAllSync<TemplateExercise>(
    `SELECT te.sort_order, te.default_sets, te.default_reps,
            e.id AS exercise_id, e.name AS exercise_name, e.muscle_group, e.equipment
     FROM template_exercises te
     JOIN exercises e ON te.exercise_id = e.id
     WHERE te.template_id = ?
     ORDER BY te.sort_order`,
    templateId
  );

  return { template, exercises };
}
