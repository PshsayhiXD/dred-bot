import fs from "fs";
import log from "./logger.js";
import thisFile from "./thisFile.js";
const dirs = ["cert", "temp", "database"];
const files = [
  "database/db.db",
  "database/trade.db",
  "database/clans.db",
  "database/marketplace.db",
  "database/active_ship.json",
  "database/changelogs.json",
  "database/leaderboardCache.json",
  "database/version.json",
  "database/scrape.do.json",
  "database/deleteScheduler.json",
  "database/motd_backup.json",
  "database/shop.db"
];
const renameTasks = [
  { from: ".env.example", to: ".env" },
  { from: "config.example.js", to: "config.js" }
];
const setup = async () => {
  await log.title("=== dredbot file setup ===", { timestamp: true });
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      await log.success(`[${thisFile(import.meta.url)}] : Created directory: ${dir}`, { timestamp: true });
    } else await log.warn(`[${thisFile(import.meta.url)}] : Directory already exists: ${dir}`, { timestamp: true });
  }
  for (const file of files) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "");
      await log.success(`[${thisFile(import.meta.url)}] : Created file: ${file}`, { timestamp: true });
    } else await log.warn(`[${thisFile(import.meta.url)}] : File already exists: ${file}`, { timestamp: true });
  }
  for (const { from, to } of renameTasks) {
    if (fs.existsSync(from) && !fs.existsSync(to)) {
      fs.renameSync(from, to);
      await log.success(`[${thisFile(import.meta.url)}] : Renamed: ${from} → ${to}`, { timestamp: true });
    } else if (!fs.existsSync(from)) await log.warn(`[${thisFile(import.meta.url)}] : File not found, skipping rename: ${from}`, { timestamp: true });
    else await log.warn(`[${thisFile(import.meta.url)}] : Target file already exists, skipping rename: ${to}`, { timestamp: true });
  }
  await log.success(`[${thisFile(import.meta.url)}] : Setup complete: directories, files, and config/env renamed`, { timestamp: true });
};
setup();