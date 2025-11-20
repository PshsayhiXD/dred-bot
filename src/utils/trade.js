import Database from "better-sqlite3";
import paths from "./path.js";
const db = new Database(paths.database.trade);

db.prepare(`
  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    ownerId TEXT,
    status TEXT,
    createdAt INTEGER,
    data TEXT
  )
`).run();

const saveTrade = trade => {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO trades (id, status, createdAt, data)
      VALUES (@id, @status, @createdAt, @data)
    `).run({
      id: trade.id,
      status: trade.status,
      createdAt: trade.createdAt,
      data: JSON.stringify(trade)
    });
    return { success: true };
  } catch (e) {
    throw new Error(`[-] saveTrade: ${e.message}`);
  }
};
const getTrade = id => {
  try {
    const row = db.prepare(`SELECT data FROM trades WHERE id = ?`).get(id);
    if (!row) return { success: false, msg: "getTrade: not found.", code: 404 };
    return { success: true, trade: JSON.parse(row.data) };
  } catch (e) {
    throw new Error(`[-] getTrade: ${e.message}`);
  }
};
const getAllTrades = () => {
  try {
    const rows = db.prepare(`SELECT data FROM trades`).all();
    return { success: true, trades: rows.map(r => JSON.parse(r.data)) };
  } catch (e) {
    throw new Error(`[-] getAllTrades: ${e.message}`);
  }
};
const getUserTrades = userId => {
  try {
    const rows = db.prepare(`SELECT data FROM trades WHERE ownerId = ?`).all(userId);
    return { success: true, trades: rows.map(r => JSON.parse(r.data)) };
  } catch (e) {
    throw new Error(`[-] getUserTrades: ${e.message}`);
  }
};
const deleteTrade = id => {
  try {
    db.prepare(`DELETE FROM trades WHERE id = ?`).run(id);
    return { success: true };
  } catch (e) {
    throw new Error(`[-] deleteTrade: ${e.message}`);
  }
};
const cleanUpExpiredTrades = (expire = 24 * 60 * 60 * 1000) => {
  try {
    const threshold = Date.now() - expire;
    const result = db.prepare(`DELETE FROM trades WHERE createdAt < ?`).run(threshold);
    return { success: true, deletedCount: result.changes };
  } catch (e) {
    throw new Error(`[-] cleanUpExpiredTrades: ${e.message}`);
  }
};

export { 
  saveTrade, 
  getTrade,
  getAllTrades,
  getUserTrades,
  deleteTrade,
  cleanUpExpiredTrades
};

export default db;