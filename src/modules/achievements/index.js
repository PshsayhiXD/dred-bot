import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import log from '../../utils/logger.js';

export const achievements = {};

export const setAchievement = async (key, data) => {
  if (!key || typeof data !== "object") throw new Error(`[setAchievement] Invalid key or data`);
  if (achievements[key]) delete achievements[key];
  createAchievement(key, data);
  return { achievement: achievements[key] };
};

export const createAchievement = (key, data) => {
  if (!key || typeof data !== 'object') throw new Error(`[createAchievement] Invalid key or data`)
  const {
    name,
    id,
    description,
    obtainable = true,
    category = 'any',
    require = [],
    need,
    dependencies = [],
    execute,
  } = data;
  if (!name || !description || typeof id !== 'number') throw new Error(`[createAchievement] Missing required fields for achievement: ${key}`);
  achievements[key] = {
    key,
    name,
    id,
    description,
    obtainable,
    category,
    require,
    need: typeof need === 'function' ? need : undefined,
    dependencies,
    execute: typeof execute === 'function' ? execute : undefined,
  };
  log(`[createAchievement] Registered achievement: ${key} (${id || -1}).`, "success");
};

export const getAchievementMetadata = (query) => {
  if (!query) return null;
  const isNumeric = !isNaN(query);
  const lower = query.toString().toLowerCase();
  if (achievements[query]) return achievements[query];
  return Object.values(achievements).find(i =>
    (isNumeric && Number(i.id) === Number(query)) ||
    i.name?.toLowerCase() === lower
  ) || null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const achievementsDirectory = path.join(__dirname);

export const loadAllAchievements = async (dir = achievementsDirectory, prefix = '') => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const newPrefix = prefix ? `${prefix}.${entry.name}` : entry.name;
      await loadAllAchievements(fullPath, newPrefix);
    } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
      const achKey = prefix ? `${prefix}.${entry.name.slice(0, -3)}` : entry.name.slice(0, -3);
      try {
        const module = await import(pathToFileURL(fullPath).href);
        const achDef = module.default;
        if (achDef && typeof achDef === 'object') createAchievement(achKey, achDef);
        else log(`[loadAllAchievements] Invalid export in ${achKey}`, 'warn');
      } catch (err) {
        log(`[loadAllAchievements] Failed to load ${achKey}: ${err.message}`, 'error');
      }
    }
  }
};
