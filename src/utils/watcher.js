import chokidar from "chokidar";
import path from "path";
import registerPrefixCommands from "../commands/register.js";
import { hotReloadSlashCommand } from "../commands/Slash/register.js";
import log from "./logger.js";
import thisFile from "./thisFile.js";
import paths from "./path.js";
import { pathToFileURL } from "url";

const upperFirst = str => str[0].toUpperCase() + str.slice(1);
const setUpWatcher = async bot => {
  if (!chokidar) return log(`[${thisFile(import.meta.url)}] Chokidar not installed, watcher disabled.`, "warn");
  const watchDirs = [
    paths.commands.dirRoot,
    paths.commands.Slash.dirRoot,
    paths.utils.dirRoot
  ];
  const w = chokidar.watch(watchDirs, { ignoreInitial: true });
  w.on("change", async p => {
    log(`[${thisFile(import.meta.url)}] Hot reload: ${p}]`, "warn");
    if (p.startsWith(paths.commands.Slash.dirRoot)) await hotReloadSlashCommand(bot, p);
    else if (p.startsWith(paths.commands.dirRoot)) await registerPrefixCommands(bot, [p]);
    else if (p.startsWith(paths.modules.dirRoot)) {
      const relPath = path.relative(paths.modules.dirRoot, p);
      const namespace = relPath.split(path.sep)[0];
      const funcName = `set${upperFirst(namespace)}`;
      const indexFile = path.join(paths.utils.dirRoot, namespace, "index.js");
      if (!indexFile) return log(`[${thisFile(import.meta.url)}] No index file for namespace: ${namespace}`, "warn");
      try {
        const mod = await import(pathToFileURL(`${indexFile}?update=${Date.now()}`));
        if (typeof mod[funcName] === "function") await mod[funcName]();
        else log(`[${thisFile(import.meta.url)}] ${funcName} not found in ${indexFile}`, "warn");
      } catch (err) {
        log(`[${thisFile(import.meta.url)}] Failed to reload ${indexFile}: ${err.message}`, "error");
      }
    } else if (p.startsWith(paths.utils.dirRoot)) {
      const relPath = path.relative(paths.utils.dirRoot, p);
      if (!relPath.includes(path.sep)) {
        try {
          await import(pathToFileURL(`${p}?update=${Date.now()}`));
          log(`[${thisFile(import.meta.url)}] Reloaded direct utils file: ${p}`, "success");
        } catch (err) {
          log(`[${thisFile(import.meta.url)}] Failed to reload direct utils file ${p}: ${err.message}`, "error");
        }
        return;
      }
    }
  });
  log(`[${thisFile(import.meta.url)}] Watcher initialized.`, "success");
  return true;
};

export default setUpWatcher;