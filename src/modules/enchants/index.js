import { readdir } from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import log from "../../utils/logger.js";

export const enchants = {};

export const setEnchant = async (id, data) => {
  if (!id || typeof data !== "object") throw new Error(`[setEnchant] Invalid ID or data`);
  if (enchants[id]) delete enchants[id];
  createEnchant(id, data, data.execute);
  return { enchant: enchants[id] };
}

export const createEnchant = (id, options = {}, execute) => {
  if (!id || typeof execute !== "function") throw new Error(`[-] createEnchant: Missing ID or execute function for ${id}`);
  enchants[id] = {
    id,
    ...options,
    execute
  };
  log(`[createEnchant] Registered enchant: ${id}.`, "success");
};

export const getEnchantMetadata = (query) => {
  if (!query) return null;
  const isNumeric = !isNaN(query);
  const lower = query.toString().toLowerCase();
  if (enchants[query]) return enchants[query];
  return Object.values(enchants).find(e =>
    (isNumeric && Number(e.id) === Number(query)) ||
    e.name?.toLowerCase() === lower
  ) || null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const enchantsDirectory = path.join(__dirname);

export const loadAllEnchants = async (dir = enchantsDirectory, prefix = "") => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await loadAllEnchants(fullPath, prefix ? `${prefix}.${entry.name}` : entry.name);
    else if (entry.name.endsWith(".js") && entry.name !== "index.js") {
      const enchantId = prefix ? `${prefix}.${entry.name.slice(0, -3)}` : entry.name.slice(0, -3);
      try {
        const module = await import(pathToFileURL(fullPath).href);
        const enchantDef = module.default;
        if (typeof enchantDef === "function") {
          const meta = enchantDef(1);
          if (!meta || typeof meta.execute !== "function") {
            log(`[loadAllEnchants] Invalid enchant format: ${enchantId}`, "warning");
            continue;
          }
          createEnchant(enchantId, { ...meta, levelFactory: enchantDef }, meta.execute);
        }
        else if (enchantDef?.execute && typeof enchantDef.execute === "function") createEnchant(enchantId, enchantDef, enchantDef.execute);
        else log(`[loadAllEnchants] Skipping ${enchantId}, invalid export.`, "warning");
      } catch (err) {
        log(`[loadAllEnchants] Failed to load ${enchantId}: ${err.message}`, "error");
      }
    }
  }
};