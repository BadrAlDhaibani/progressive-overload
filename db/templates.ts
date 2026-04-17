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
  is_assisted: number;
  sort_order: number;
  default_sets: number;
  default_reps: number;
}

export function getAllTemplates(): Template[] {
  return db.getAllSync<Template>('SELECT * FROM templates ORDER BY created_at DESC');
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
            e.id AS exercise_id, e.name AS exercise_name, e.muscle_group, e.equipment, e.is_assisted
     FROM template_exercises te
     JOIN exercises e ON te.exercise_id = e.id
     WHERE te.template_id = ?
     ORDER BY te.sort_order`,
    templateId
  );

  return { template, exercises };
}

export function createTemplate(name: string): number {
  const result = db.runSync('INSERT INTO templates (name) VALUES (?)', name);
  return result.lastInsertRowId;
}

export function updateTemplate(id: number, name: string): void {
  db.runSync('UPDATE templates SET name = ? WHERE id = ?', name, id);
}

export function deleteTemplate(id: number): void {
  db.runSync('DELETE FROM templates WHERE id = ?', id);
}

export function replaceTemplateExercises(
  templateId: number,
  exercises: Array<{
    exercise_id: number;
    sort_order: number;
    default_sets: number;
    default_reps: number;
  }>
): void {
  db.execSync('BEGIN');
  try {
    db.runSync('DELETE FROM template_exercises WHERE template_id = ?', templateId);
    for (const ex of exercises) {
      db.runSync(
        `INSERT INTO template_exercises (template_id, exercise_id, sort_order, default_sets, default_reps)
         VALUES (?, ?, ?, ?, ?)`,
        templateId,
        ex.exercise_id,
        ex.sort_order,
        ex.default_sets,
        ex.default_reps
      );
    }
    db.execSync('COMMIT');
  } catch (e) {
    db.execSync('ROLLBACK');
    throw e;
  }
}
