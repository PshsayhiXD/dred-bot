import chokidar from "chokidar";
import path from "path";
import registerPrefixCommands from "../commands/register.js";
import { hotReloadSlashCommand } from "../commands/Slash/register.js";
import log from "./logger.js";
import thisFile from "./thisFile.js";
import paths from "./path.js";
import { pathToFileURL } from "url";
import { helper } from "./helper.js";

const upperFirst = str => str[0].toUpperCase() + str.slice(1);
const setUpWatcher = async bot => {
  if (!chokidar) return log(`[${thisFile(import.meta.url)}] Chokidar not installed, watcher disabled.`, "warn");
  const watchDirs = [
    paths.src.commands.dirRoot,
    paths.src.commands.Slash.dirRoot,
    paths.src.utils.dirRoot
  ];
  const w = chokidar.watch(watchDirs, { ignoreInitial: true });
  w.on("change", async p => {
    log(`[${thisFile(import.meta.url)}] Hot reload: ${p}]`, "warn");
    if (p.startsWith(paths.src.commands.Slash.dirRoot)) await hotReloadSlashCommand(bot, p);
    else if (p.startsWith(paths.src.commands.dirRoot)) await registerPrefixCommands(bot, [p]);
    else if (p.startsWith(paths.src.modules.dirRoot)) {
      const relPath = path.relative(paths.modules.dirRoot, p);
      const namespace = relPath.split(path.sep)[0];
      const funcName = `set${upperFirst(namespace)}`;
      const indexFile = path.join(paths.utils.dirRoot, namespace, "index.js");
      if (!indexFile) return log(`[${thisFile(import.meta.url)}] No index file for namespace: ${namespace}`, "warn");
      try {
        const url = new URL(pathToFileURL(indexFile));
        url.searchParams.set("update", Date.now());
        const mod = await import(url.href);
        if (typeof mod[funcName] === "function") await mod[funcName]();
        else log(`[${thisFile(import.meta.url)}] ${funcName} not found in ${indexFile}`, "warn");
      } catch (err) {
        log(`[${thisFile(import.meta.url)}] Failed to reload ${indexFile}: ${err.message}`, "error");
      }
    } else if (p.startsWith(paths.src.utils.dirRoot)) {
      if (p === paths.src.utils.watcher) return log(`[${thisFile(import.meta.url)}] Skipping ${p}: Cannot reload self`);
      if (p === paths.src.utils.commandComponent) return log(`[${thisFile(import.meta.url)}] Skipping ${p}: Cannot reload a registery`);
      if (p === paths.src.utils.deleteScheduler) return log(`[${thisFile(import.meta.url)}] Skipping ${p}: Cannot reload a scheduler`);
      try {
        const url = new URL(pathToFileURL(p));
        url.searchParams.set("update", Date.now());
        const mod = await import(url.href);
        const helperPath = path.join(paths.utils.dirRoot, "helper.js");
        if (path.resolve(p) === path.resolve(helperPath)) {
          Object.assign(helper, mod);
          log(`[${thisFile(import.meta.url)}] Reloaded utils ${p} and ${p} modules`);
        } 
        else log(`[${thisFile(import.meta.url)}] Reloaded direct utils file: ${p}`, "success");
      } catch (err) {
        log(`[${thisFile(import.meta.url)}] Failed to reload direct utils file ${p}: ${err.message}`, "error");
      }
      return;
    }
  });
  log(`[${thisFile(import.meta.url)}] Watcher initialized.`, "success");
  return true;
};

export default setUpWatcher;