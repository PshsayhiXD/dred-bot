import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const r = (...segments) => path.resolve(__dirname, "../..", ...segments);
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
  env: r(".env"),
  envExample: r(".env.example"),
  packageJson: r("package.json"),
  packageLockFile: r("package-lock.json"),
  dotGitignore: r(".gitignore"),
  test: r("test"),
  temp: r("temp"),
  archive: r("archive"),
  assets: r("assets"),
  src: mapDir("src", [".js"]),

  utils: mapDir("src/utils", [".js"]),
  events: mapDir("src/events", [".js"]),
  commands: mapDir("src/commands", [".js"]),
  middleware: mapDir("src/middleware", [".js"]),
  routes: {
    root: r("src/routes"),
    app: mapDir("src/routes/app", [".js"]),
    internal: mapDir("src/routes/internal", [".js"])
  },
  public: mapDir("public", [".html", ".ico", ".css", ".js"]),
  certs: mapDir("certs", [".pem", ".crt", ".key"]),
  database: mapDir("database", [".json", ".db"]),
  scss: mapDir("src/scss", [".scss"]),
  templates: mapDir("src/templates", [".html", ".js"]),
  modules: mapDir("src/modules", [".js"]),
};

export default paths;