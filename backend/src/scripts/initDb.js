import fs from 'node:fs';
import path from 'node:path';
import { query, pool } from '../db/pool.js';

const schemaPath = path.resolve(process.cwd(), '..', 'database', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

try {
  await query(schema);
  console.log('Database schema initialized.');
} finally {
  await pool.end();
}
