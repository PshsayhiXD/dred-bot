import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const r = (...segments) => path.resolve(__dirname, "..", ...segments);
const safeKey = (name) => name.replace(/\W+/g, "_");
const mapDir = (dirRelative, exts = [".js"]) => {
  const dirPath = r(dirRelative);
  const result = { dirRoot: dirPath };
  if (!fs.existsSync(dirPath)) return result;
  for (const entryName of fs.readdirSync(dirPath)) {
    if (entryName.startsWith(".")) continue;
    const entryFullPath = path.join(dirPath, entryName);
    const stats = fs.statSync(entryFullPath);
    if (stats.isDirectory()) {
      result[safeKey(entryName)] = mapDir(path.join(dirRelative, entryName), exts);
    } else if (stats.isFile()) {
      const ext = path.extname(entryName);
      if (exts.includes(ext)) {
        const base = safeKey(path.basename(entryName, ext));
        result[base] = entryFullPath;
      }
    }
  }
  return result;
};

const paths = {
  dirRoot: r(""),
  bot: r("bot.js"),
  config: r("config.js"),
  ui: r("ui.js"),
  localhost: r("localhost.js"),
  env: r(".env"),
  wss: r("wss.js"),
  temp: r("temp"),
  version: r("version.js"),

  language: mapDir("language", [".json"]),
  utils: mapDir("utils", [".js"]),
  tasks: mapDir("tasks", [".js"]),
  commands: mapDir("commands", [".js"]),
  middleware: mapDir("middleware", [".js"]),
  routes: {
    root: r("routes"),
    app: mapDir("routes/app", [".js"]),
    internal: mapDir("routes/internal", [".js"])
  },
  html: mapDir("html", [".html", ".js"]),
  public: mapDir("public", [".html", ".ico", ".css", ".js"]),
  certs: mapDir("certs", [".pem", ".crt", ".key"]),
  database: mapDir("database", [".json", ".db"])
};

export default paths;