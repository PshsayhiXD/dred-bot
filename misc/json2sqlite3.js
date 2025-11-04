import fs from 'fs/promises';
import Database from 'better-sqlite3';
import paths from '../utils/path.js';
const db = new Database(paths.database.db);
const jsonPath = paths.database.data;
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )
`).run();

async function migrateJsonToSQLite() {
  try {
    const jsonData = await fs.readFile(jsonPath, 'utf-8');
    const parsed = JSON.parse(jsonData);
    const insert = db.prepare(`
      INSERT INTO users (id, data)
      VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data
    `);
    const transaction = db.transaction(() => {
      for (const [userId, userData] of Object.entries(parsed)) {
        insert.run(userId, JSON.stringify(userData));
      }
    });
    transaction();
    console.log('[+] Migration complete!');
  } catch (err) {
    console.error('[-] Migration failed:', err);
  }
}
migrateJsonToSQLite();