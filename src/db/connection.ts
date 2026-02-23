import Knex from 'knex';
import * as path from 'path';

const db = Knex({
  client: 'better-sqlite3',
  connection: {
    filename: path.resolve(process.cwd(), 'data/research.db'),
  },
  useNullAsDefault: true,
});

export default db;
