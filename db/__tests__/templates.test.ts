jest.mock('expo-sqlite', () => {
  const { makeShim } = require('../../test-setup/db-mock');
  return { openDatabaseSync: () => makeShim() };
});

import { db, SCHEMA_DDL } from '../database';
import { createTemplate, replaceTemplateExercises, getTemplateWithExercises } from '../templates';
import { resetMockDb } from '../../test-setup/db-mock';

beforeEach(() => {
  resetMockDb(SCHEMA_DDL);
});

function seedExercise(name: string): number {
  return db.runSync(
    "INSERT INTO exercises (name, muscle_group) VALUES (?, 'Chest')",
    name
  ).lastInsertRowId;
}

function templateExerciseRows(templateId: number) {
  return db.getAllSync<{ exercise_id: number; sort_order: number }>(
    'SELECT exercise_id, sort_order FROM template_exercises WHERE template_id = ? ORDER BY sort_order',
    templateId
  );
}

describe('replaceTemplateExercises', () => {
  it('clears existing rows and inserts the new set', () => {
    const benchId = seedExercise('Bench');
    const squatId = seedExercise('Squat');
    const tpl = createTemplate('Push');

    replaceTemplateExercises(tpl, [
      { exercise_id: benchId, sort_order: 0, default_sets: 3, default_reps: 5 },
      { exercise_id: squatId, sort_order: 1, default_sets: 4, default_reps: 8 },
    ]);
    expect(templateExerciseRows(tpl)).toEqual([
      { exercise_id: benchId, sort_order: 0 },
      { exercise_id: squatId, sort_order: 1 },
    ]);

    replaceTemplateExercises(tpl, [
      { exercise_id: squatId, sort_order: 0, default_sets: 5, default_reps: 5 },
    ]);
    expect(templateExerciseRows(tpl)).toEqual([{ exercise_id: squatId, sort_order: 0 }]);
  });

  it('honors the sort_order on the replacement (reorder works)', () => {
    const a = seedExercise('A');
    const b = seedExercise('B');
    const c = seedExercise('C');
    const tpl = createTemplate('Reorder');

    replaceTemplateExercises(tpl, [
      { exercise_id: a, sort_order: 0, default_sets: 3, default_reps: 5 },
      { exercise_id: b, sort_order: 1, default_sets: 3, default_reps: 5 },
      { exercise_id: c, sort_order: 2, default_sets: 3, default_reps: 5 },
    ]);

    replaceTemplateExercises(tpl, [
      { exercise_id: c, sort_order: 0, default_sets: 3, default_reps: 5 },
      { exercise_id: a, sort_order: 1, default_sets: 3, default_reps: 5 },
      { exercise_id: b, sort_order: 2, default_sets: 3, default_reps: 5 },
    ]);

    const result = getTemplateWithExercises(tpl);
    expect(result?.exercises.map((e) => e.exercise_id)).toEqual([c, a, b]);
  });

  it('treats an empty replacement list as "delete all rows for this template"', () => {
    const a = seedExercise('A');
    const tpl = createTemplate('ToBeEmptied');
    replaceTemplateExercises(tpl, [
      { exercise_id: a, sort_order: 0, default_sets: 3, default_reps: 5 },
    ]);
    expect(templateExerciseRows(tpl)).toHaveLength(1);

    replaceTemplateExercises(tpl, []);
    expect(templateExerciseRows(tpl)).toEqual([]);
  });

  it('rolls back on insert failure (FK violation) so the original rows survive', () => {
    const a = seedExercise('A');
    const tpl = createTemplate('Atomic');
    replaceTemplateExercises(tpl, [
      { exercise_id: a, sort_order: 0, default_sets: 3, default_reps: 5 },
    ]);
    expect(templateExerciseRows(tpl)).toEqual([{ exercise_id: a, sort_order: 0 }]);

    expect(() =>
      replaceTemplateExercises(tpl, [
        { exercise_id: 99999, sort_order: 0, default_sets: 3, default_reps: 5 },
      ])
    ).toThrow();

    expect(templateExerciseRows(tpl)).toEqual([{ exercise_id: a, sort_order: 0 }]);
  });
});
