import db from "./db.js";

db.prepare(`
  CREATE TABLE IF NOT EXISTS marketplace (
    id TEXT PRIMARY KEY,
    seller TEXT NOT NULL,
    item TEXT NOT NULL,
    price INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  )
`).run();

const getAllListings = () => {
  const rows = db.prepare(`SELECT * FROM marketplace ORDER BY timestamp DESC`).all();
  return rows.map(row => ({
    id: row.id,
    seller: row.seller,
    item: JSON.parse(row.item),
    price: row.price,
    timestamp: row.timestamp
  }));
};
const getListing = (id) => {
  const row = db.prepare(`SELECT * FROM marketplace WHERE id = ?`).get(id);
  if (!row) return null;
  return {
    id: row.id,
    seller: row.seller,
    item: JSON.parse(row.item),
    price: row.price,
    timestamp: row.timestamp
  };
};
const saveListing = (listing) => {
  const { id, seller, item, price, timestamp } = listing;
  db.prepare(`
    INSERT INTO marketplace (id, seller, item, price, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, seller, JSON.stringify(item), price, timestamp);
};
const deleteListing = (id) => {
  db.prepare(`DELETE FROM marketplace WHERE id = ?`).run(id);
};

export default db;

export {
  getAllListings,
  getListing,
  saveListing,
  deleteListing,
};