import { commandEmbed } from '../utils/commandComponent.js';
import { DateTime } from 'luxon';
import config from '../config.js';
import log from '../utils/logger.js';
import thisFile from '../utils/thisFile.js';
let regionInterval = null;
const setupRegionTimer = async (bot) => {
  if (regionInterval) return;
  const channel = await bot.channels.fetch(config.RegionalTimerChannelID);
  if (!channel?.isTextBased()) return log(`[${thisFile(import.meta.url)}] : Invalid channel.`, 'warn');
  const update = async () => {
    const fields = config.REGIONAL_TIMER.map(({ name, tz }) => {
      const dt = DateTime.now().setZone(tz);
      return { name, value: `**\`${dt.toFormat('HH:mm:ss')}\`** → \`${dt.toFormat('hh:mma')}\``, inline: true };
    });
    const embed = await commandEmbed({
      title: '🌏 Regional Timers',
      color: 0x808080,
      fields,
      footer: { text: `Updates every ${config.REGIONAL_TIMER_INTERVAL}m` }
    });
    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      const exist = messages.find(m => m.author.id === bot.user.id && m.embeds.length > 0);
      if (exist) await exist.edit({ embeds: [embed] });
      else await channel.send({ embeds: [embed] });
    } catch (err) {
      log(`[${thisFile(import.meta.url)}] regionTimer: ${err.message}.`, 'error');
    }
  };
  await update();
  regionInterval = setInterval(update, config.REGIONAL_TIMER_INTERVAL * 60_000);
  log(`[${thisFile(import.meta.url)}] registered.`, "success");
};

export default setupRegionTimer;