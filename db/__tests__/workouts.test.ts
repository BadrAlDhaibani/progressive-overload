jest.mock('expo-sqlite', () => {
  const { makeShim } = require('../../test-setup/db-mock');
  return { openDatabaseSync: () => makeShim() };
});

import { db, SCHEMA_DDL } from '../database';
import { createWorkout, getLastPerformance, insertSet } from '../workouts';
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

function insertFinishedWorkoutAt(startedAt: string, finishedAt: string): number {
  return db.runSync(
    'INSERT INTO workouts (name, started_at, finished_at) VALUES (?, ?, ?)',
    'w',
    startedAt,
    finishedAt
  ).lastInsertRowId;
}

describe('getLastPerformance', () => {
  it('returns [] when there is no prior history', () => {
    const exId = seedExercise('Bench');
    const currentId = createWorkout();
    expect(getLastPerformance(exId, currentId)).toEqual([]);
  });

  it('returns the prior workout sets ordered by set_order ASC', () => {
    const exId = seedExercise('Bench');
    const priorId = insertFinishedWorkoutAt('2026-04-20 10:00:00', '2026-04-20 11:00:00');
    insertSet(priorId, exId, 2, 145, 8);
    insertSet(priorId, exId, 1, 135, 10);
    insertSet(priorId, exId, 3, 155, 6);

    const currentId = createWorkout();
    expect(getLastPerformance(exId, currentId)).toEqual([
      { set_order: 1, weight: 135, reps: 10 },
      { set_order: 2, weight: 145, reps: 8 },
      { set_order: 3, weight: 155, reps: 6 },
    ]);
  });

  it('returns only the most recent workout when multiple prior workouts exist', () => {
    const exId = seedExercise('Bench');
    const oldId = insertFinishedWorkoutAt('2026-04-15 10:00:00', '2026-04-15 11:00:00');
    const newId = insertFinishedWorkoutAt('2026-04-22 10:00:00', '2026-04-22 11:00:00');
    insertSet(oldId, exId, 1, 100, 12);
    insertSet(newId, exId, 1, 135, 10);
    insertSet(newId, exId, 2, 145, 8);

    const currentId = createWorkout();
    const result = getLastPerformance(exId, currentId);
    expect(result).toEqual([
      { set_order: 1, weight: 135, reps: 10 },
      { set_order: 2, weight: 145, reps: 8 },
    ]);
  });

  it('excludes the current in-progress workout from history (w.id != ? guard)', () => {
    const exId = seedExercise('Bench');
    const currentId = createWorkout();
    insertSet(currentId, exId, 1, 200, 5);

    expect(getLastPerformance(exId, currentId)).toEqual([]);
  });

  it('excludes unfinished workouts (finished_at IS NOT NULL guard)', () => {
    const exId = seedExercise('Bench');
    const abandoned = createWorkout();
    insertSet(abandoned, exId, 1, 999, 1);

    const currentId = createWorkout();
    expect(getLastPerformance(exId, currentId)).toEqual([]);
  });

  it('does not bleed sets from other exercises', () => {
    const benchId = seedExercise('Bench');
    const squatId = seedExercise('Squat');
    const priorId = insertFinishedWorkoutAt('2026-04-20 10:00:00', '2026-04-20 11:00:00');
    insertSet(priorId, benchId, 1, 135, 10);
    insertSet(priorId, squatId, 1, 225, 5);

    const currentId = createWorkout();
    expect(getLastPerformance(benchId, currentId)).toEqual([
      { set_order: 1, weight: 135, reps: 10 },
    ]);
  });
});
