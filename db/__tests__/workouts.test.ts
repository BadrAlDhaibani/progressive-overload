jest.mock('expo-sqlite', () => {
  const { makeShim } = require('../../test-setup/db-mock');
  return { openDatabaseSync: () => makeShim() };
});

import { db, SCHEMA_DDL } from '../database';
import {
  createWorkout,
  getLastPerformance,
  getRecentExerciseSets,
  insertSet,
  updateSet,
} from '../workouts';
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

function insertUnfinishedWorkoutAt(startedAt: string): number {
  return db.runSync(
    'INSERT INTO workouts (name, started_at, finished_at) VALUES (?, ?, NULL)',
    'w',
    startedAt
  ).lastInsertRowId;
}

function insertCompletedSet(
  workoutId: number,
  exerciseId: number,
  setOrder: number,
  weight: number,
  reps: number
): number {
  const id = insertSet(workoutId, exerciseId, setOrder, weight, reps);
  updateSet(id, weight, reps, 1);
  return id;
}

function daysAgo(n: number): string {
  const ms = Date.now() - n * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
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

describe('getRecentExerciseSets', () => {
  it('returns completed sets for eligible exercises, ordered exercise_id ASC, started_at DESC, set_order ASC', () => {
    const exId = seedExercise('Bench');
    const olderAt = daysAgo(10);
    const newerAt = daysAgo(3);
    const olderId = insertFinishedWorkoutAt(olderAt, olderAt);
    const newerId = insertFinishedWorkoutAt(newerAt, newerAt);
    insertCompletedSet(olderId, exId, 1, 135, 10);
    insertCompletedSet(olderId, exId, 2, 145, 8);
    insertCompletedSet(newerId, exId, 1, 145, 10);
    insertCompletedSet(newerId, exId, 2, 155, 8);

    expect(getRecentExerciseSets(30)).toEqual([
      {
        exercise_id: exId, exercise_name: 'Bench', muscle_group: 'Chest', is_assisted: 0,
        workout_id: newerId, started_at: newerAt, set_order: 1, weight: 145, reps: 10,
      },
      {
        exercise_id: exId, exercise_name: 'Bench', muscle_group: 'Chest', is_assisted: 0,
        workout_id: newerId, started_at: newerAt, set_order: 2, weight: 155, reps: 8,
      },
      {
        exercise_id: exId, exercise_name: 'Bench', muscle_group: 'Chest', is_assisted: 0,
        workout_id: olderId, started_at: olderAt, set_order: 1, weight: 135, reps: 10,
      },
      {
        exercise_id: exId, exercise_name: 'Bench', muscle_group: 'Chest', is_assisted: 0,
        workout_id: olderId, started_at: olderAt, set_order: 2, weight: 145, reps: 8,
      },
    ]);
  });

  it('excludes exercises with only 1 session in the window', () => {
    const benchId = seedExercise('Bench');
    const squatId = seedExercise('Squat');
    const w1At = daysAgo(5);
    const w2At = daysAgo(2);
    const w1 = insertFinishedWorkoutAt(w1At, w1At);
    const w2 = insertFinishedWorkoutAt(w2At, w2At);
    insertCompletedSet(w1, benchId, 1, 135, 10);
    insertCompletedSet(w2, benchId, 1, 145, 10);
    insertCompletedSet(w1, squatId, 1, 225, 5);

    const rows = getRecentExerciseSets(30);
    expect(rows.map((r) => r.exercise_id)).toEqual([benchId, benchId]);
  });

  it('excludes workouts older than `days` (and drops the exercise if it falls below 2 sessions)', () => {
    const exId = seedExercise('Bench');
    const recentAt = daysAgo(5);
    const oldAt = daysAgo(60);
    const recentId = insertFinishedWorkoutAt(recentAt, recentAt);
    const oldId = insertFinishedWorkoutAt(oldAt, oldAt);
    insertCompletedSet(recentId, exId, 1, 135, 10);
    insertCompletedSet(oldId, exId, 1, 100, 10);

    expect(getRecentExerciseSets(30)).toEqual([]);
  });

  it('excludes incomplete sets and unfinished workouts', () => {
    const exId = seedExercise('Bench');
    const w1At = daysAgo(5);
    const w2At = daysAgo(2);
    const w1 = insertFinishedWorkoutAt(w1At, w1At);
    const w2 = insertFinishedWorkoutAt(w2At, w2At);
    insertCompletedSet(w1, exId, 1, 135, 10);
    insertSet(w1, exId, 2, 145, 8);
    insertCompletedSet(w2, exId, 1, 145, 10);
    const unfinished = insertUnfinishedWorkoutAt(daysAgo(1));
    insertCompletedSet(unfinished, exId, 1, 200, 5);

    expect(getRecentExerciseSets(30)).toEqual([
      {
        exercise_id: exId, exercise_name: 'Bench', muscle_group: 'Chest', is_assisted: 0,
        workout_id: w2, started_at: w2At, set_order: 1, weight: 145, reps: 10,
      },
      {
        exercise_id: exId, exercise_name: 'Bench', muscle_group: 'Chest', is_assisted: 0,
        workout_id: w1, started_at: w1At, set_order: 1, weight: 135, reps: 10,
      },
    ]);
  });
});
