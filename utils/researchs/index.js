import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import log from '../logger.js';

export const researchs = {};

export const setResearch = async (name, data) => {
  if (!name || typeof data !== 'object') throw new Error(`[setResearch] Invalid name or data`);
  if (researchs[name]) delete researchs[name];
  createResearch(name, data);
  return { research: researchs[name] };
}

export const createResearch = (name, options = {}) => {
  if (!name) throw new Error(`[-] createResearch: Missing ID`);
  researchs[name] = {
    name,
    ...options
  };
  log(`[createResearch] Registered research: ${name} (${options.id || -1}).`, "success");
};

export const getResearchMetadata = (query) => {
  if (!query) return null;
  const isNumeric = !isNaN(query);
  const lower = query.toString().toLowerCase();
  if (researchs[query]) return researchs[query];
  return Object.values(researchs).find(i =>
    (isNumeric && Number(i.id) === Number(query)) ||
    i.name?.toLowerCase() === lower
  ) || null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const researchDirectory = path.join(__dirname);

export const loadAllResearchs = async (dir = researchDirectory, prefix = '') => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await loadAllResearchs(fullPath, prefix ? `${prefix}.${entry.name}` : entry.name);
    else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
      const research = prefix ? `${prefix}.${entry.name.slice(0, -3)}` : entry.name.slice(0, -3);
      try {
        const module = await import(pathToFileURL(fullPath).href);
        const def = module.default;
        if (typeof def === 'function') createResearch(research, {});
        else createResearch(research, def || {});
      } catch (err) {
        log(`[loadAllResearch] Failed to load ${research}: ${err.message}`, 'error');
      }
    }
  }
  for (const [id, node] of Object.entries(researchs)) {
    if (node.requires && Array.isArray(node.requires)) {
      for (const req of node.requires) {
        if (!researchs[req]) log(`[loadAllResearch] Invalid require "${req}" in "${id}" - does not exist.`, 'warn');
      }
    }
  }
};