jest.mock('expo-sqlite', () => {
  const { makeShim } = require('../../test-setup/db-mock');
  return { openDatabaseSync: () => makeShim() };
});

import { db, SCHEMA_DDL } from '../database';
import { deleteExercise, getExerciseUsage } from '../exercises';
import { createWorkout, finishWorkout, insertSet } from '../workouts';
import { createTemplate, replaceTemplateExercises } from '../templates';
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

function exerciseExists(id: number): boolean {
  return db.getFirstSync('SELECT 1 FROM exercises WHERE id = ?', id) !== null;
}

function workoutExists(id: number): boolean {
  return db.getFirstSync('SELECT 1 FROM workouts WHERE id = ?', id) !== null;
}

function templateExists(id: number): boolean {
  return db.getFirstSync('SELECT 1 FROM templates WHERE id = ?', id) !== null;
}

describe('getExerciseUsage', () => {
  it('returns zeros for an unused exercise', () => {
    const exId = seedExercise('Lonely');
    expect(getExerciseUsage(exId)).toEqual({
      setsCount: 0,
      workoutsCount: 0,
      templatesCount: 0,
    });
  });

  it('counts sets, distinct workouts, and distinct templates', () => {
    const exId = seedExercise('Used');
    const w1 = createWorkout();
    const w2 = createWorkout();
    insertSet(w1, exId, 1, 100, 5);
    insertSet(w1, exId, 2, 100, 5);
    insertSet(w2, exId, 1, 100, 5);

    const t1 = createTemplate('A');
    const t2 = createTemplate('B');
    replaceTemplateExercises(t1, [
      { exercise_id: exId, sort_order: 0, default_sets: 3, default_reps: 5 },
    ]);
    replaceTemplateExercises(t2, [
      { exercise_id: exId, sort_order: 0, default_sets: 4, default_reps: 6 },
    ]);

    expect(getExerciseUsage(exId)).toEqual({
      setsCount: 3,
      workoutsCount: 2,
      templatesCount: 2,
    });
  });
});

describe('deleteExercise', () => {
  it('removes an unused exercise with no side effects', () => {
    const exId = seedExercise('Lonely');
    deleteExercise(exId);
    expect(exerciseExists(exId)).toBe(false);
  });

  it('keeps a workout that still has other exercises after the cascade', () => {
    const benchId = seedExercise('Bench');
    const squatId = seedExercise('Squat');
    const w = createWorkout();
    insertSet(w, benchId, 1, 135, 10);
    insertSet(w, squatId, 1, 225, 5);
    finishWorkout(w);

    deleteExercise(benchId);

    expect(exerciseExists(benchId)).toBe(false);
    expect(workoutExists(w)).toBe(true);
    const remaining = db.getAllSync<{ exercise_id: number }>(
      'SELECT exercise_id FROM sets WHERE workout_id = ?',
      w
    );
    expect(remaining).toEqual([{ exercise_id: squatId }]);
  });

  it('deletes a workout where the exercise was the only one (empty-parent cleanup)', () => {
    const exId = seedExercise('Solo');
    const w = createWorkout();
    insertSet(w, exId, 1, 100, 5);
    finishWorkout(w);

    deleteExercise(exId);

    expect(exerciseExists(exId)).toBe(false);
    expect(workoutExists(w)).toBe(false);
  });

  it('keeps a template that still has other exercises after the cascade', () => {
    const benchId = seedExercise('Bench');
    const squatId = seedExercise('Squat');
    const tpl = createTemplate('Push');
    replaceTemplateExercises(tpl, [
      { exercise_id: benchId, sort_order: 0, default_sets: 3, default_reps: 5 },
      { exercise_id: squatId, sort_order: 1, default_sets: 3, default_reps: 5 },
    ]);

    deleteExercise(benchId);

    expect(templateExists(tpl)).toBe(true);
    const remaining = db.getAllSync<{ exercise_id: number }>(
      'SELECT exercise_id FROM template_exercises WHERE template_id = ?',
      tpl
    );
    expect(remaining).toEqual([{ exercise_id: squatId }]);
  });

  it('deletes a template where the exercise was the only one and nulls workouts.template_id', () => {
    const exId = seedExercise('Solo');
    const tpl = createTemplate('JustOne');
    replaceTemplateExercises(tpl, [
      { exercise_id: exId, sort_order: 0, default_sets: 3, default_reps: 5 },
    ]);
    db.runSync('INSERT INTO workouts (name, template_id) VALUES (?, ?)', 'from-tpl', tpl);

    deleteExercise(exId);

    expect(templateExists(tpl)).toBe(false);
    const orphaned = db.getAllSync<{ template_id: number | null }>(
      'SELECT template_id FROM workouts WHERE name = ?',
      'from-tpl'
    );
    expect(orphaned).toEqual([{ template_id: null }]);
  });
});
