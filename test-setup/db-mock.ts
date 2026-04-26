import Database from 'better-sqlite3';

interface MockState {
  db: Database.Database | null;
}

export const mockState: MockState = { db: null };

export function makeShim() {
  return {
    execSync: (sql: string) => mockState.db!.exec(sql),
    runSync: (sql: string, ...params: unknown[]) => {
      const r = mockState.db!.prepare(sql).run(...(params as never[]));
      return {
        changes: r.changes,
        lastInsertRowId: Number(r.lastInsertRowid),
      };
    },
    getAllSync: <T,>(sql: string, ...params: unknown[]): T[] =>
      mockState.db!.prepare(sql).all(...(params as never[])) as T[],
    getFirstSync: <T,>(sql: string, ...params: unknown[]): T | null => {
      const row = mockState.db!.prepare(sql).get(...(params as never[]));
      return (row as T | undefined) ?? null;
    },
  };
}

export function resetMockDb(schemaDDL: string): void {
  if (mockState.db) {
    mockState.db.close();
  }
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(schemaDDL);
  mockState.db = db;
}
