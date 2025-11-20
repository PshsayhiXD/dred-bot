import Database from "better-sqlite3";
import fs from "fs/promises";
import paths from "./path.js";
import dotenv from "dotenv";
dotenv.config({ path: paths.env });

const db = new Database(paths.database.db);

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )
`).run();

const readData = async (path) => {return JSON.parse(await fs.readFile(path, "utf-8"))};
const writeData = async (path, data) => {await fs.writeFile(path, JSON.stringify(data, null, 2))};
const readText = async (path) => {return await fs.readFile(path, "utf-8")};
const writeText = async (path, data) => {await fs.writeFile(path, data, "utf-8")};
const loadData = async (userId) => {
  const row = db.prepare("SELECT data FROM users WHERE id = ?").get(userId);
  if (!row) return {};
  return JSON.parse(row.data);
};
const loadAllData = () => {
  const rows = db.prepare("SELECT id, data FROM users").all();
  return rows.map((row) => ({ username: row.id, ...JSON.parse(row.data) }));
};
const loadAllUsers = () => {
  const rows = db.prepare("SELECT id FROM users").all();
  return rows.map((row) => ({ username: row.id }));
};
const loadDataByAccountId = (accountId) => {
  const row = db
    .prepare("SELECT data FROM users WHERE json_extract(data, '$.account.id') = ?")
    .get(accountId);
  if (!row) return {};
  return JSON.parse(row.data);
};
const loadUsernameByAccountId = (accountId) => {
  const rows = db.prepare("SELECT id, data FROM users").all();
  for (const row of rows) {
    const parsed = JSON.parse(row.data);
    if (parsed?.account?.id === accountId) return row.id;
  }
  return null;
};
const loadDataByAccountCookie = (cookie) => {
  const row = db
    .prepare("SELECT data FROM users WHERE json_extract(data, '$.account.cookie') = ?")
    .get(cookie);
  if (!row) return null;
  return JSON.parse(row.data);
};
const loadUsernameByAccountCookie = (cookie) => {
  const rows = db.prepare("SELECT id, data FROM users").all();
  for (const row of rows) {
    const parsed = JSON.parse(row.data);
    if (parsed?.account?.cookie === cookie) return row.id;
  }
  return null;
}
const isValidUser = (userId) => {
  const row = db.prepare("SELECT 1 FROM users WHERE id = ?").get(userId);
  return !!row;
};
const quickSaveUserIdData = (userId, newValue) => {
  const json = JSON.stringify(newValue);
  db.prepare(
    `INSERT INTO users (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`
  ).run(userId, json);
}
const saveData = async (userId, data) => {
  const json = JSON.stringify(data);
  db.prepare(
    `INSERT INTO users (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`
  ).run(userId, json);
};
const writeEnv = async (key, value) => {process.env[key] = value};
const readEnv = async (key) => {return process.env[key] || null};
const envAll = async () => {
  const env = {};
  for (const key in process.env) {
    if (process.env.hasOwnProperty(key)) env[key] = process.env[key];
  }
  return env;
};

export {
  readData,
  writeData,
  readText,
  writeText,
  loadData,
  loadAllData,
  loadDataByAccountId,
  loadUsernameByAccountId,
  isValidUser,
  saveData,
  writeEnv,
  readEnv,
  envAll,
  quickSaveUserIdData,
  loadDataByAccountCookie,
  loadUsernameByAccountCookie,
  loadAllUsers
};

export default db;