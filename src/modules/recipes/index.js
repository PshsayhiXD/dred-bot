import { readdir } from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import log from "../../utils/logger.js";

export const recipes = {};

export const setRecipe = async (name, data) => {
  if (!name || typeof data !== "object") throw new Error(`[setRecipe] Invalid name or data`);
  if (recipes[name]) delete recipes[name];
  createRecipe(name, data);
  return { recipe: recipes[name] };
}

export const createRecipe = (name, data) => {
  if (!name || typeof data !== "object" || !data.need || !data.to) throw new Error(`[-] createRecipe: Invalid or missing definition for '${id}'.`);
  const parts = name.split(".");
  let ref = recipes;
  while (parts.length > 1) {
    const part = parts.shift();
    if (!ref[part]) ref[part] = {};
    ref = ref[part];
  }
  ref[parts[0]] = { 
    name, 
    ...data 
  };
  log(`[createRecipe] Registered recipe: ${name} (${data.id || -1}).`, "success");
};

export const getRecipeMetadata = (query) => {
  return recipes[query] || null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const recipesDirectory = path.join(__dirname);

export const loadAllRecipes = async (dir = recipesDirectory, prefix = "") => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await loadAllRecipes(fullPath, prefix ? `${prefix}.${entry.name}` : entry.name);
    } else if (entry.name.endsWith(".js") && entry.name !== "index.js") {
      const recipe = prefix ? `${prefix}.${entry.name.slice(0, -3)}` : entry.name.slice(0, -3);
      try {
        const mod = await import(pathToFileURL(fullPath).href);
        const def = mod.default;
        if (!def || !def.inputs || !def.output) {
          log(`[loadAllRecipes] Skipping ${recipe}, invalid format.`, "warning");
          continue;
        }
        createRecipe(recipe, def);
      } catch (err) {
        log(`[loadAllRecipes] Failed to load ${recipe}: ${err.message}`, "error");
      }
    }
  }
};