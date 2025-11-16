import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';
import paths from '../../utils/path.js';
import log from '../../utils/logger.js';
import config from '../../config.js';
import thisFile from '../../utils/thisFile.js';
dotenv.config({ path: paths.env });

export default async function removeSlashCommands(mode = 'guild') {
  const TOKEN = process.env.DISCORD_TOKEN;
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    if (mode === 'global') {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
      log(`[${thisFile(import.meta.url)}] All global slash commands removed.`);
    } else {
      const guildId = mode === 'guild' ? config.GUILD_ID : mode;
      if (!guildId) throw new Error('Guild ID not specified and config.GUILD_ID missing.');
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: [] });
      log(`[${thisFile(import.meta.url)}] All slash commands removed from guild: ${guildId}`);
    }
  } catch (error) {
    log(`[${thisFile(import.meta.url)}] Failed to remove slash commands: ${error}`, 'error');
  }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const modeArg = process.argv[2] || 'guild';
  (async function () {
    await removeSlashCommands(modeArg);
  })();
}
