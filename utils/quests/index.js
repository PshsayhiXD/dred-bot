import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import log from '../logger.js';

export const quests = {};

export const setQuest = async (key, data) => {
  if (!key || typeof data !== 'object') throw new Error(`[setQuest] Invalid key or data`);
  if (quests[key]) delete quests[key];
  createQuest(key, data);
  return { quest: quests[key] };
}

export const createQuest = (key, data) => {
  if (!key || typeof data !== 'object') throw new Error(`[createQuest] Invalid key or data`);
  const {
    id,
    name,
    description,
    obtainable = true,
    questType = [],
    require = [],
    dependencies = [],
    execute,
    need
  } = data;
  if (typeof id !== 'number' || !name || !description) throw new Error(`[createQuest] Missing required fields in quest: ${key}`);
  quests[key] = {
    key,
    id,
    name,
    description,
    obtainable,
    questType,
    require,
    dependencies,
    execute: typeof execute === 'function' ? execute : undefined,
    need: typeof need === 'function' ? need : undefined
  };
  log(`[createQuest] Registered quest: ${key} (${id}).`, "success");
};

export const getQuestMetadata = (query) => {
  if (!query) return null;
  const isNumeric = !isNaN(query);
  const lower = query.toString().toLowerCase();
  if (quests[query]) return quests[query];
  return Object.values(quests).find(i =>
    (isNumeric && Number(i.id) === Number(query)) ||
    i.name?.toLowerCase() === lower
  ) || null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const questsDirectory = path.join(__dirname);

export const loadAllQuests = async (dir = questsDirectory, prefix = '') => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const newPrefix = prefix ? `${prefix}.${entry.name}` : entry.name;
      await loadAllQuests(fullPath, newPrefix);
    } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
      const questKey = prefix ? `${prefix}.${entry.name.slice(0, -3)}` : entry.name.slice(0, -3);
      try {
        const module = await import(pathToFileURL(fullPath).href);
        const questDef = module.default;
        if (questDef && typeof questDef === 'object') createQuest(questKey, questDef);
        else log(`[loadAllQuests] Invalid export in ${questKey}`, 'warn');
      } catch (err) {
        log(`[loadAllQuests] Failed to load ${questKey}: ${err.message}`, 'error');
      }
    }
  }
};