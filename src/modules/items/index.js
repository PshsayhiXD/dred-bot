import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import log from '../../utils/logger.js';

export const items = {};

export const setItem = async (name, data) => {
  if (!name || typeof data !== 'object') throw new Error(`[setItem] Invalid name or data`);
  if (items[name]) delete items[name];
  createItem(name, data, data.execute);
  return { item: items[name] };
}

export const createItem = (name, options = {}, execute) => {
  if (!name || typeof execute !== 'function') throw new Error(`[-] createItem: Missing ID or execute function for ${id}`);
  items[name] = {
    name,
    ...options,
    execute
  };
  log(`[createItem] Registered item: ${name} (${options.id || -1}).`, "success");
};

export const getItemMetadata = (query) => {
  if (!query) return null;
  const isNumeric = !isNaN(query);
  const lower = query.toString().toLowerCase();
  if (items[query]) return items[query];
  return Object.values(items).find(i =>
    (isNumeric && Number(i.id) === Number(query)) ||
    i.name?.toLowerCase() === lower
  ) || null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const itemsDirectory = path.join(__dirname);
export const loadAllItems = async (dir = itemsDirectory, prefix = '') => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await loadAllItems(fullPath, prefix ? `${prefix}.${entry.name}` : entry.name);
    else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
      const item = prefix ? `${prefix}.${entry.name.slice(0, -3)}` : entry.name.slice(0, -3);
      try {
        const module = await import(pathToFileURL(fullPath).href);
        const itemDef = module.default;
        if (typeof itemDef === 'function') createItem(item, {}, itemDef);
        else if (itemDef?.execute && typeof itemDef.execute === 'function') createItem(item, itemDef, itemDef.execute);
        else log(`[loadAllItems] Skipping ${item}, invalid export.`, 'warning');
      } catch (err) {
        log(`[loadAllItems] Failed to load ${item}: ${err.message}`, 'error');
      }
    }
  }
};