import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import log from '../logger.js';

export const skills = {};

export const setSkill = async (name, data) => {
  if (!name || typeof data !== 'object') throw new Error(`[setSkill] Invalid name or data`);
  if (skills[name]) delete skills[name];
  createSkill(name, data, data.apply);
  return { skill: skills[name] };
}

export const createSkill = (name, options = {}, apply) => {
  if (!name) throw new Error(`[-] createSkill: Missing name.`);
  skills[name] = {
    name,
    ...options,
    apply: typeof apply === 'function' ? apply : undefined
  };
  log(`[createSkill] Registered skill: ${name} (${options.id || -1}).`, "success");
};

export const getSkillMetadata = (query) => {
  if (!query) return null;
  const isNumeric = !isNaN(query);
  const lower = query.toString().toLowerCase();
  if (skills[query]) return skills[query];
  return Object.values(skills).find(i =>
    (isNumeric && Number(i.id) === Number(query)) ||
    i.name?.toLowerCase() === lower
  ) || null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const skillsDirectory = path.join(__dirname);

export const loadAllSkills = async (dir = skillsDirectory, prefix = '') => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await loadAllSkills(fullPath, prefix ? `${prefix}.${entry.name}` : entry.name);
    else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
      const skill = prefix ? `${prefix}.${entry.name.slice(0, -3)}` : entry.name.slice(0, -3);
      try {
        const module = await import(pathToFileURL(fullPath).href);
        const skillDef = module.default;
        if (typeof skillDef === 'function') createSkill(skill, {}, skillDef);
        else if (skillDef?.apply && typeof skillDef.apply === 'function') createSkill(skillId, skillDef, skillDef.apply);
        else createSkill(skill, skillDef || {});
      } catch (err) {
        log(`[loadAllSkills] Failed to load ${skill}: ${err.message}`, 'error');
      }
    }
  }
};