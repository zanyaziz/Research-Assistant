import Knex from 'knex';
import * as path from 'path';

const db = Knex({
  client: 'better-sqlite3',
  connection: {
    filename: path.resolve(process.cwd(), 'data/research.db'),
  },
  useNullAsDefault: true,
  pool: {
    // WAL mode: writes are atomic and crash-safe. If the process is killed
    // mid-write the WAL file is simply rolled back on next open — no corruption.
    afterCreate: (conn: any, done: (err: Error | null, conn: any) => void) => {
      conn.pragma('journal_mode = WAL');
      done(null, conn);
    },
  },
});

export default db;
