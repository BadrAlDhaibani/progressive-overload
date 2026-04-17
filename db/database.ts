import { openDatabaseSync } from 'expo-sqlite';
import { seedDatabase } from './seed';

export const db = openDatabaseSync('provolone.db');

export function initDatabase(): void {
  db.execSync('PRAGMA foreign_keys = ON');
  db.execSync('PRAGMA journal_mode = WAL');

  db.execSync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      muscle_group  TEXT NOT NULL,
      equipment     TEXT DEFAULT 'Barbell',
      is_custom     INTEGER DEFAULT 0,
      is_assisted   INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT,
      started_at  TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      template_id INTEGER REFERENCES templates(id)
    );

    CREATE TABLE IF NOT EXISTS sets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id  INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      set_order   INTEGER NOT NULL,
      weight      REAL,
      reps        INTEGER,
      is_complete INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS template_exercises (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      sort_order  INTEGER NOT NULL,
      default_sets INTEGER DEFAULT 3,
      default_reps INTEGER DEFAULT 8
    );

    CREATE INDEX IF NOT EXISTS idx_sets_workout ON sets(workout_id);
    CREATE INDEX IF NOT EXISTS idx_sets_exercise ON sets(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_workouts_started ON workouts(started_at);
  `);

  const result = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  if (result && result.user_version === 0) {
    seedDatabase(db);
    db.execSync('PRAGMA user_version = 2');
  } else if (result && result.user_version === 1) {
    const cols = db.getAllSync<{ name: string }>('PRAGMA table_info(exercises)');
    if (!cols.some((c) => c.name === 'is_assisted')) {
      db.execSync('ALTER TABLE exercises ADD COLUMN is_assisted INTEGER DEFAULT 0');
    }
    db.execSync('PRAGMA user_version = 2');
  }
}
