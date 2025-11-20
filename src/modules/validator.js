import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import log from "../utils/logger.js";
import { chalk } from "../utils/helper.js";
import thisFile from "../utils/thisFile.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serialize = (v) => {
  if (typeof v === "function") return v.toString();
  if (typeof v === "string") return `"${v}"`;
  if (Array.isArray(v)) return `[${v.map(serialize).join(", ")}]`;
  if (typeof v === "object" && v) return `{ ${Object.entries(v).map(([k, val]) => `${k}: ${serialize(val)}`).join(", ")} }`;
  return String(v);
};
const validateObject = (type, file, obj, defaultObj) => {
  const errors = [];
  const warnings = [];
  const info = [];
  const emptyAllowed = obj._emptyAllowed || [];
  for (const key in defaultObj) {
    if (!(key in obj)) {
      errors.push(`[${type}: ${file}] Missing property "${key}", using default value`);
      obj[key] = defaultObj[key];
      continue;
    }
    const val = obj[key];
    const defVal = defaultObj[key];
    if (typeof val !== typeof defVal) {
      warnings.push(`[${type}: ${file}] "${key}" type mismatch, expected "${typeof defVal}", got "${typeof val}", using default`);
      obj[key] = defVal;
      continue;
    }
    if (emptyAllowed.includes(key)) continue;
    if (typeof val === "string" && val.trim() === "") warnings.push(`[${type}: ${file}] "${key}" is empty string`);
    else if (typeof val === "object" && val && Object.keys(val).length === 0) warnings.push(`[${type}: ${file}] "${key}" is empty object`);
    else if (typeof val === "function") {
      const isEmptyFunc = val.toString().match(/^\s*(async\s*)?\(?\w*,?\s*\)?\s*=>\s*{\s*}$/);
      if (isEmptyFunc) warnings.push(`[${type}: ${file}] Function "${key}" is empty`);
    }
  }
  for (const key of Object.keys(obj)) {
    if (!(key in defaultObj)) warnings.push(`[${type}: ${file}] Unexpected property "${key}" found`);
  }
  return { obj, errors, warnings, info };
};
const recursiveJSFiles = async (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === "index.js") continue;
    if (entry.isDirectory()) out.push(...(await recursiveJSFiles(full)));
    else if (entry.isFile() && typeof entry.name === "string" && entry.name.endsWith(".js")) out.push(full);
  }
  return out;
};
const getValidatorForFile = (validators, file, baseDir, category) => {
  const relative = path.relative(baseDir, file).replace(/\\/g, "/");
  const parts = relative.split("/");
  parts.pop();
  for (let i = parts.length; i >= 0; i--) {
    const prefix = [category, ...parts.slice(0, i)].join(".");
    if (validators[prefix]) return validators[prefix];
  }
  return validators[category] || null;
};
const loadModules = async (dir, validators, defaultValidators) => {
  const base = dir;
  const files = await recursiveJSFiles(base);
  const category = path.basename(dir);
  const allErrors = [];
  const allWarnings = [];
  const allInfo = [];
  for (const file of files) {
    try {
      const imp = await import(pathToFileURL(file));
      if (!imp.default) {
        allErrors.push(`[${category}: ${file}] Missing default export.`);
        continue;
      }
      let mod = imp.default;
      if (typeof mod === "function") mod = mod();
      const validator = getValidatorForFile(defaultValidators, file, base, category);
      if (!validator) {
        allErrors.push(`[${category}: ${file}] No default validator found.`);
        continue;
      }
      const { obj, errors, warnings, info } = validateObject(category, file, mod, validator);
      allErrors.push(...errors);
      allWarnings.push(...warnings);
      allInfo.push(...info);
    } catch (e) {
      allErrors.push(`[${category}: ${file}] Import error: ${e.message}.`);
    }
  }
  return { errors: allErrors, warnings: allWarnings, info: allInfo };
};
const main = async () => {
  const validatorDir = path.join(__dirname, "validator");
  if (!fs.existsSync(validatorDir)) return log(chalk(`[${thisFile(import.meta.url)}] validator folder not found`, "red"), "error");
  const validatorFiles = fs.readdirSync(validatorDir).filter(f => f.endsWith(".js"));
  const validators = {};
  for (const file of validatorFiles) {
    const full = path.join(validatorDir, file);
    try {
      const imp = await import(pathToFileURL(full));
      if (!imp.default) continue;
      validators[path.basename(file, ".js")] = typeof imp.default === "function" ? imp.default() : imp.default;
    } catch (e) {
      log(chalk(`[${thisFile(import.meta.url)}] failed to load validator ${file}: ${e.message}`, "red"), "error");
    }
  }
  const allErrors = [];
  const allWarnings = [];
  const allInfo = [];
  const allSuccess = [];
  for (const [name] of Object.entries(validators)) {
    if (name.includes(".")) continue;
    const typeDir = path.join(__dirname, name);
    if (!fs.existsSync(typeDir)) {
      allErrors.push(`[${thisFile(import.meta.url)}] "${name}" folder not found under utils/`);
      continue;
    }
    try {
      const { errors, warnings, info } = await loadModules(typeDir, validators, validators);
      allErrors.push(...errors);
      allWarnings.push(...warnings);
      allInfo.push(...info);
      if (!errors.length && !warnings.length) allSuccess.push(`[${thisFile(import.meta.url)}] ${name} validated without issues`);
    } catch (e) {
      allErrors.push(`[${thisFile(import.meta.url)}] failed while validating "${name}": ${e.message}`);
    }
  }
  if (allErrors.length) console.log(await chalk(`\n[Errors]\n${allErrors.join("\n")}`, "red"));
  if (allWarnings.length) console.log(await chalk(`\n[Warnings]\n${allWarnings.join("\n")}`, "yellow"));
  if (allInfo.length) console.log(await chalk(`\n[Info]\n${allInfo.join("\n")}`, "blue"));
  if (allSuccess.length) console.log(await chalk(`\n[Success]\n${allSuccess.join("\n")}`, "green"));
};

main();