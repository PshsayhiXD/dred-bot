import paths from '../utils/path.js';
import path from 'path';
import registerPrefixCommands from './command-register.js';
import { hotReloadSlashCommand } from './Slash/slash-register.js';
import log from '../utils/logger.js';
import thisFile from '../utils/thisFile.js';
let chokidar;
try {
  chokidar = await import('chokidar');
} catch {
  chokidar = null;
}
const setUpCommandWatcher = async (bot) => {
  if (!chokidar) return log(`[${thisFile(import.meta.url)}] Chokidar not installed, command watching disabled.`, 'warn');
  const w = chokidar.watch([paths.commands.dirRoot, paths.commands.Slash.dirRoot], {
    ignoreInitial: true,
  });
  w.on('change', async (p) => {
    log(`[${thisFile(import.meta.url)}] Hot reload: ${p}]`, 'warn');
    if (p.startsWith(paths.commands.dirRoot)) {
      const relativePath = path.relative(paths.commands.dirRoot, p);
      await registerPrefixCommands(bot, [p]);
    } else if (p.startsWith(paths.commands.Slash.dirRoot)) {
      const relativePath = path.relative(paths.commands.Slash.dirRoot, p);
      await hotReloadSlashCommand(bot, relativePath);
    }
  });
  log(`[${thisFile(import.meta.url)}] Command watcher initialized.`);
  return true;
};
export default setUpCommandWatcher;