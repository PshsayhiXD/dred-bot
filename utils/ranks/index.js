import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import log from '../logger.js';

export const ranks = {};

export const createRank = (name, options = {}) => {
  if (!name) throw new Error(`[-] createRank: Missing name`);
  ranks[name] = {
    name,
    ...options
  };
  log(`[createRank] Registered rank: ${name} (${options.id || -1}).`, 'success');
};

export const getRankMetadata = (query) => {
  if (!query) return null;
  const isNumeric = !isNaN(query);
  const lower = query.toString().toLowerCase();
  if (ranks[query]) return ranks[query];
  return Object.values(ranks).find(i =>
    (isNumeric && Number(i.value) === Number(query)) ||
    i.name?.toLowerCase() === lower
  ) || null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ranksDirectory = path.join(__dirname);

export const loadAllRanks = async (dir = ranksDirectory, prefix = '') => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await loadAllRanks(fullPath, prefix ? `${prefix}.${entry.name}` : entry.name);
    else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
      const rankName = prefix ? `${prefix}.${entry.name.slice(0, -3)}` : entry.name.slice(0, -3);
      try {
        const module = await import(pathToFileURL(fullPath).href);
        const def = module.default;
        if (!def || typeof def !== 'object') {
          log(`[loadAllRanks] Invalid export in ${rankName}`, 'warn');
          continue;
        }
        createRank(rankName, def);
      } catch (err) {
        log(`[loadAllRanks] Failed to load ${rankName}: ${err.message}`, 'error');
      }
    }
  }
};