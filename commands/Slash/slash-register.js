import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { REST, Routes } from 'discord.js';
import paths from '../../utils/path.js';
import config from '../../config.js';
import log from '../../utils/logger.js';
import thisFile from '../../utils/thisFile.js';
dotenv.config({ path: paths.env });
export async function hotReloadSlashCommand(bot, changedFile) {
  if (!bot.slashCommands) return;
  const filePath = path.join(process.cwd(), changedFile);
  try {
    const { default: newCommand } = await import(`${pathToFileURL(filePath).href}?v=${Date.now()}`);
    if (!newCommand?.data || typeof newCommand.execute !== 'function') return log(`[${thisFile(import.meta.url)}] Invalid slash command in hot reload: ${changedFile}`, 'warn');
    const existing = bot.slashCommands.get(newCommand.data.name);
    if (!existing) return log(`[${thisFile(import.meta.url)}] Slash command not loaded yet, skipping: ${newCommand.data.name}`, 'warn');
    existing.execute = newCommand.execute;
    log(`[${thisFile(import.meta.url)}] Updated execute function for slash command: ${newCommand.data.name}`, 'success');
  } catch (err) {
    log(`[${thisFile(import.meta.url)}] Failed to hot reload slash command: ${err}`, 'error');
  }
}
export default async function registerSlashCommands(bot, mode = 'guild') {
  const commands = [];
  bot.slashCommands = new Map();
  const commandFiles = fs.readdirSync(paths.commands.Slash.dirRoot).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(paths.commands.Slash.dirRoot, file);
    const { default: command } = await import(`file://${filePath}?v=${Date.now()}`);
    if (!command?.data || typeof command.execute !== 'function') {
      log(`[${thisFile(import.meta.url)}] Skipping invalid slash command: ${file}`, 'warn');
      continue;
    }
    bot.slashCommands.set(command.data.name, command);
    const json = command.data.toJSON();
    commands.push(json);
    log(`[${thisFile(import.meta.url)}] Loaded slash command: ${command.data.name}.`, 'success');
  }
  const TOKEN = process.env.DISCORD_TOKEN;
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  if (!TOKEN || !CLIENT_ID) return log(`[${thisFile(import.meta.url)}] Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment variables.`, 'error');
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    log(`[${thisFile(import.meta.url)}] Registering ${commands.length} slash command(s)...`, 'warn');
    if (mode === 'n') return log(`[${thisFile(import.meta.url)}] aborting registerSlash (bot.slashcommands stay the same)`, 'success');
    else if (mode === 'global') {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, config.GUILD_ID), { body: [] });
      log(`[${thisFile(import.meta.url)}] Cleared guild commands.`, 'warn');
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      log(`[${thisFile(import.meta.url)}] Slash commands registered globally.`, 'warn');
    } else {
      const guildId = mode === 'global' ? null : mode === 'guild' ? config.GUILD_ID : mode;
      if (!guildId) throw new Error('Guild ID not specified and config.GUILD_ID missing.');
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: commands });
      log(`[${thisFile(import.meta.url)}] Slash commands registered to guild: ${guildId}`, 'warn');
    }
  } catch (error) {
    log(`[${thisFile(import.meta.url)}] Failed to register slash commands: ${error}`, 'error');
  }
}
