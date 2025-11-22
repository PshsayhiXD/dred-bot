import Database from "better-sqlite3";
import paths from "./path.js";

const dbPath = paths.database.shop;
const db = new Database(dbPath);

db.prepare(`
  CREATE TABLE IF NOT EXISTS shop (
    id TEXT PRIMARY KEY,
    item TEXT NOT NULL,
    category TEXT,
    timestamp INTEGER NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS shop_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itemId TEXT NOT NULL,
    userId TEXT,
    quantity INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS shop_news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS shop_config (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS shop_user_stock (
    userId TEXT NOT NULL,
    itemId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY(userId, itemId)
  )
`).run();

// ----------------------- SHOP ITEMS -----------------------
const getAllShopItems = () => {
  const rows = db.prepare(`SELECT * FROM shop ORDER BY timestamp DESC`).all();
  return rows.map(row => {
    const parsedItem = JSON.parse(row.item);
    parsedItem.options ??= {};
    return { id: row.id, item: parsedItem, category: row.category, timestamp: row.timestamp };
  });
};

const getShopItem = (id) => {
  const row = db.prepare(`SELECT * FROM shop WHERE id = ?`).get(id);
  if (!row) return null;
  const parsedItem = JSON.parse(row.item);
  parsedItem.options ??= {};
  return { id: row.id, item: parsedItem, category: row.category, timestamp: row.timestamp };
};

const getShopItemByName = (name) => getAllShopItems().find(r => r.item.name === name) || null;
const itemExists = (name) => !!getShopItemByName(name);

const addShopItem = ({ id, item, category, timestamp }) => {
  const safeItem = { ...item };
  safeItem.options ??= {};
  db.prepare(`INSERT INTO shop (id, item, category, timestamp) VALUES (?, ?, ?, ?)`)
    .run(id, JSON.stringify(safeItem), category, timestamp);
};

const updateShopItem = (id, updates) => {
  const fields = [];
  const values = [];
  if (updates.item !== undefined) {
    const safeItem = { ...updates.item };
    safeItem.options ??= {};
    fields.push("item = ?");
    values.push(JSON.stringify(safeItem));
  }
  if (updates.category !== undefined) {
    fields.push("category = ?");
    values.push(updates.category);
  }
  if (!fields.length) return;
  values.push(id);
  db.prepare(`UPDATE shop SET ${fields.join(", ")} WHERE id = ?`).run(...values);
};

const removeShopItem = (id) => db.prepare(`DELETE FROM shop WHERE id = ?`).run(id);

// ----------------------- STOCK -----------------------
const getGlobalStock = (itemId) => {
  const row = db.prepare(`SELECT item FROM shop WHERE id = ?`).get(itemId);
  if (!row) return null;
  const shopItem = JSON.parse(row.item);
  return shopItem.options?.stock?.globalStock?.quantity ?? null;
};

const setGlobalStock = (itemId, qty) => {
  const row = db.prepare(`SELECT item FROM shop WHERE id = ?`).get(itemId);
  if (!row) return false;
  const shopItem = JSON.parse(row.item);
  shopItem.options ??= {};
  shopItem.options.stock ??= {};
  shopItem.options.stock.globalStock ??= {};
  shopItem.options.stock.globalStock.quantity = qty;
  db.prepare(`UPDATE shop SET item = ? WHERE id = ?`).run(JSON.stringify(shopItem), itemId);
  return true;
};

const getUserStock = (userId, itemId) => {
  const row = db.prepare(`SELECT quantity FROM shop_user_stock WHERE userId = ? AND itemId = ?`).get(userId, itemId);
  return row?.quantity ?? null;
};

const setUserStock = (userId, itemId, qty) => {
  db.prepare(`
    INSERT INTO shop_user_stock (userId, itemId, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT(userId, itemId) DO UPDATE SET quantity = excluded.quantity
  `).run(userId, itemId, qty);
};

// ----------------------- GLOBAL RESTOCK -----------------------
const setGlobalRestockTime = (timestamp) => {
  db.prepare(`INSERT OR REPLACE INTO shop_config (key, value) VALUES ('lastRestock', ?)`)
    .run(timestamp.toString());
};

const getGlobalRestockTime = () => {
  const row = db.prepare(`SELECT value FROM shop_config WHERE key = 'lastRestock'`).get();
  return row ? parseInt(row.value, 10) : 0;
};

const restockAllItems = ({ chance = 50, minQty = 1, maxQty = 5, restockUserStock = false } = {}) => {
  const now = Date.now();
  const items = getAllShopItems();
  items.forEach(item => {
    const globalStockEnabled = item.item.options?.stock?.globalStock?.enabled;
    const userStockEnabled = restockUserStock && item.item.options?.stock?.userStock?.enabled;
    if (globalStockEnabled && Math.random() * 100 <= chance) {
      let qty = Array.isArray(item.item.options.stock.globalStock.quantity)
        ? Math.floor(Math.random() * (item.item.options.stock.globalStock.quantity[1] - item.item.options.stock.globalStock.quantity[0] + 1)) + item.item.options.stock.globalStock.quantity[0]
        : item.item.options.stock.globalStock.quantity ?? minQty;
      setGlobalStock(item.id, qty);
    }
    if (userStockEnabled) {
      // Optional: restock all users for this item (not implemented per user here)
    }
  });
  setGlobalRestockTime(now);
};

const getNextGlobalRestock = (interval) => {
  const remaining = getGlobalRestockTime() + interval - Date.now();
  if (remaining <= 0) return "00:00";
  const minutes = Math.floor(remaining / 60000).toString().padStart(2, "0");
  const seconds = Math.floor((remaining % 60000) / 1000).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

// Manual restock
const restockItem = (itemId, userId = null, amount = null) => {
  const item = getShopItem(itemId);
  if (!item || !item.item.options?.stock) return false;
  if (userId && item.item.options?.stock?.userStock?.enabled) {
    let qty = amount ?? item.item.options.stock.userStock.initial ?? 1;
    setUserStock(userId, itemId, qty);
    return true;
  }
  if (item.item.options?.stock?.globalStock?.enabled) {
    let qty = amount ?? item.item.options.stock.globalStock.quantity ?? 1;
    setGlobalStock(itemId, qty);
    return true;
  }
  return false;
};

const enableStock = (itemId, globalQty = 0, userQty = 0) => {
  const item = getShopItem(itemId);
  if (!item) return false;
  item.item.options ??= {};
  item.item.options.stock ??= {};
  if (globalQty !== null) item.item.options.stock.globalStock = { enabled: true, quantity: globalQty };
  if (userQty !== null) item.item.options.stock.userStock = { enabled: true, initial: userQty };
  updateShopItem(itemId, { item: item.item });
  return true;
};

const disableStock = (itemId) => {
  const item = getShopItem(itemId);
  if (!item) return false;
  delete item.item.options?.stock;
  updateShopItem(itemId, { item: item.item });
  return true;
};

// ----------------------- PURCHASES -----------------------
const canBuy = async (userId, item, qty) => {
  if (item.options?.stock?.userStock?.enabled) {
    const userQty = getUserStock(userId, item.id) ?? item.options.stock.userStock.initial ?? 0;
    if (userQty < qty) return [false, `You don't have enough personal stock for ${item.item.name}.`];
  }
  if (item.options?.stock?.globalStock?.enabled) {
    const globalQty = getGlobalStock(item.id);
    if (globalQty !== null && globalQty < qty) return [false, `Not enough global stock for ${item.item.name}.`];
  }
  return [true];
};

const buyItem = async (userId, item, qty) => {
  const [ok, msg] = await canBuy(userId, item, qty);
  if (!ok) return [false, msg];

  if (item.options?.stock?.userStock?.enabled) {
    const userQty = getUserStock(userId, item.id) ?? item.options.stock.userStock.initial ?? 0;
    setUserStock(userId, item.id, userQty - qty);
  }

  if (item.options?.stock?.globalStock?.enabled) {
    const globalQty = getGlobalStock(item.id);
    setGlobalStock(item.id, globalQty - qty);
  }

  incrementPurchase(item.id, userId, qty);
  return [true];
};

const incrementPurchase = (itemId, userId = null, quantity = 1) => {
  db.prepare(`INSERT INTO shop_sales (itemId, userId, quantity, timestamp) VALUES (?, ?, ?, ?)`)
    .run(itemId, userId, quantity, Date.now());
};

const getUserPurchaseCount = (userId, itemId, period = "all") => {
  const now = Date.now();
  let query = `SELECT SUM(quantity) as total FROM shop_sales WHERE userId = ? AND itemId = ?`;
  if (period !== "all") query += ` AND timestamp >= ?`;
  const since = { daily: now - 86400000, weekly: now - 604800000, monthly: now - 2592000000, yearly: now - 31536000000 }[period] || 0;
  const row = db.prepare(query).get(userId, itemId, since);
  return row?.total || 0;
};

const getGlobalPurchaseCount = (itemId, period = "all") => {
  const now = Date.now();
  let query = `SELECT SUM(quantity) as total FROM shop_sales WHERE itemId = ?`;
  if (period !== "all") query += ` AND timestamp >= ?`;
  const since = { daily: now - 86400000, weekly: now - 604800000, monthly: now - 2592000000, yearly: now - 31536000000 }[period] || 0;
  const row = db.prepare(query).get(itemId, since);
  return row?.total || 0;
};

// ----------------------- NEWS -----------------------
const addNews = (message) => {
  db.prepare(`INSERT INTO shop_news (message, timestamp) VALUES (?, ?)`).run(message, Date.now());
};

const getNews = (limit = 5) => db.prepare(`SELECT * FROM shop_news ORDER BY timestamp DESC LIMIT ?`).all(limit);

// ----------------------- UTILS -----------------------
const getItemsByCategory = (category) => getAllShopItems().filter(i => i.category === category || i.item.options?.meta?.category === category);
const clearShop = () => {
  db.prepare(`DELETE FROM shop`).run();
  db.prepare(`DELETE FROM shop_sales`).run();
  db.prepare(`DELETE FROM shop_news`).run();
  db.prepare(`DELETE FROM shop_user_stock`).run();
  db.prepare(`DELETE FROM shop_config`).run();
};

// ----------------------- EXPORT -----------------------
export default db;
export {
  getAllShopItems,
  getShopItem,
  getShopItemByName,
  itemExists,
  addShopItem,
  updateShopItem,
  removeShopItem,
  getGlobalStock,
  setGlobalStock,
  getUserStock,
  setUserStock,
  restockAllItems,
  getNextGlobalRestock,
  restockItem,
  enableStock,
  disableStock,
  canBuy,
  buyItem,
  incrementPurchase,
  getUserPurchaseCount,
  getGlobalPurchaseCount,
  getItemsByCategory,
  addNews,
  getNews,
  clearShop
};