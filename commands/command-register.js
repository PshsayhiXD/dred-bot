import fs from 'fs';
import path from 'path';
import paths from '../utils/path.js';
import { Collection } from 'discord.js';
import { pathToFileURL } from 'url';
import log from '../utils/logger.js';
import thisFile from '../utils/thisFile.js';
function getCommandFiles(dir) {
  let files = [];
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) files = files.concat(getCommandFiles(fullPath));
    else if (file.endsWith('.js')) files.push(fullPath);
  }
  return files;
}
export default async function registerPrefixCommands(bot, selected = 'all') {
  if (!bot.commands) bot.commands = new Collection();
  const commandFiles = selected === 'all' ? getCommandFiles(paths.commands.dirRoot) : selected;
  const filesToLoad = Array.isArray(commandFiles) ? commandFiles : [commandFiles];
  for (const filePath of filesToLoad) {
    try {
      const fileUrl = pathToFileURL(filePath).href;
      delete (await import.meta.resolve(fileUrl));
      const { default: command } = await import(fileUrl);
      if (!command?.name || typeof command.execute !== 'function') {
        log(`[${thisFile(import.meta.url)}] Skipping invalid prefix command: ${filePath}`, 'warn');
        continue;
      }
      bot.commands.set(command.name, command);
      log(`[${thisFile(import.meta.url)}] Loaded/Updated prefix command: ${command.name}`, 'success');
    } catch (err) {
      log(`[${thisFile(import.meta.url)}] Failed to load ${filePath}: ${err}`, 'error');
    }
  }
  if (selected === 'all') log(`[${thisFile(import.meta.url)}] Loaded ${bot.commands.size} prefix command(s).`, 'success');
}