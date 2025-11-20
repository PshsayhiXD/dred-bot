import fs from "fs";
import crypto from "crypto";
import config from "./config.js";
const getPaths = async () => (await import("./utils/path.js")).default;
const readFileSafe = (p) => fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
const cleanContent = (txt) => txt.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, "");
const shouldIgnore = (p) => typeof p === "string" && config.IGNORE_PATHS.some(ig => p.includes(ig));
const hashFolder = (item) => {
  const hash = crypto.createHash("sha256");
  if (!item) return hash.digest("hex");
  if (typeof item === "string") {
    if (!fs.existsSync(item) || shouldIgnore(item)) return hash.digest("hex");
    const stat = fs.statSync(item);
    if (stat.isDirectory()) {
      for (const f of fs.readdirSync(item)) hash.update(hashFolder(`${item}/${f}`));
    } else if (stat.isFile()) hash.update(cleanContent(fs.readFileSync(item, "utf8")));
  } else if (typeof item === "object") {
    if (item.dirRoot && fs.existsSync(item.dirRoot) && !shouldIgnore(item.dirRoot)) hash.update(hashFolder(item.dirRoot));
    for (const k in item) if (k !== "root" && item[k]) hash.update(hashFolder(item[k]));
  }
  return hash.digest("hex");
};
export const version = async () => {
  const paths = await getPaths();
  const file = paths.database.version;
  const folders = [
    { obj: paths.commands, weight: 3 },
    { obj: paths.tasks, weight: 3 },
    { obj: paths.utils, weight: 3 },
    { obj: paths.middleware, weight: 3 },
    { obj: paths.routes, weight: 2 },
    { obj: paths.html, weight: 2 },
    { obj: paths.public, weight: 1 },
    { obj: paths.config, weight: 2 },
    { obj: paths.version, weight: 2 },
    { obj: paths.wss, weight: 2 },
    { obj: paths.scss, weight: 1},
    { obj: paths.localhost, weight: 1 },
    { obj: paths.public.language, weight: 1 },
  ];
  let data;
  try {
    data = fs.existsSync(file) ? JSON.parse(readFileSafe(file)) : {};
  } catch {
    data = {};
  }
  data.major = Number.isFinite(data.major) ? data.major : 1;
  data.minor = Number.isFinite(data.minor) ? data.minor : 0;
  data.patch = Number.isFinite(data.patch) ? data.patch : 0;
  data.hashes = data.hashes || {};
  data.lastUpdate = data.lastUpdate || "";
  const newHashes = {};
  let totalWeight = 0;
  const changed = [];
  for (const { obj, weight } of folders) {
    if (!obj) continue;
    const hash = hashFolder(obj);
    const name = typeof obj === "string"
      ? obj.split(/[\\/]/).pop()
      : obj.dirRoot
        ? obj.dirRoot.split(/[\\/]/).pop()
        : "unknown";
    newHashes[name] = hash;
    if (hash !== data.hashes[name]) {
      changed.push(name);
      totalWeight += weight;
    }
  }
  if (!changed.length) {
    return [
      `Version Information:`,
      `Current Version: v${data.major}.${data.minor}.${data.patch}.`,
      `Last Update: ${data.lastUpdate}.`
    ].join("\n");
  }
  const bump = totalWeight >= 5 ? "major" : totalWeight >= 3 ? "minor" : "patch";
  const previousVersion = `v${data.major}.${data.minor}.${data.patch}`;
  if (bump === "major") data.major++, data.minor = 0, data.patch = 0;
  else if (bump === "minor") data.minor++, data.patch = 0;
  else data.patch++;
  data.hashes = newHashes;
  data.lastUpdate = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  const folderHashes = Object.entries(newHashes)
    .map(([k,h]) => `  ${k}: ${h.slice(0,6)}`)
    .join("\n");
  const hashSnippet = changed.map(f => newHashes[f].slice(0,3)).join("");
  const version = `v${data.major}_${data.minor}_${data.patch}_${bump}_${hashSnippet}_${new Date().toISOString().slice(0,10).replace(/-/g,"")}`;
  return [
    `Version Updated!`,
    `Previous Version: ${previousVersion}.`,
    `Type: ${bump}.`,
    `New Version: ${version}.`,
    `Changed Folders: ${changed.join(", ")}.`,
    `Folder Hash Summary:\n${folderHashes}.`,
    `Updated Timestamp: ${data.lastUpdate}.`
  ].join("\n");
};