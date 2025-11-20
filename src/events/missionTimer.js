import { commandEmbed } from "../utils/commandComponent.js";
import config from "../config.js";
import log from "../utils/logger.js";
import { getFutureMission, getMissionState } from '../utils/helper.js';
import thisFile from "../utils/thisFile.js";
log(`[${thisFile(import.meta.url)}] THIS TASK IS MEMORY-LEAKING USE AT YOUR OWN RISK`, 'warn')

let missionInterval = null;
let updating = false;

const setupMissionTimer = async (bot) => {
  if (missionInterval) return;
  const channel = await bot.channels.fetch(config.MissionTimerChannelID);
  if (!channel?.isTextBased()) return log(`[${thisFile(import.meta.url)}]: Invalid channel.`, "error");
  const update = async () => {
    if (updating) return;
    updating = true;
    try {
      const { state, nextChange } = await getMissionState(config.MISSION_START_TS);
      const emoji = state === "OPEN" ? "✅" : "❌";
      const future = await getFutureMission(config.MISSION_START_TS, config.MISSION_SHOW_FUTURE || 3);
      let desc = `**State**: ${emoji} ${state}\n`;
      desc += state === "OPEN" ? `**Close in**: <t:${nextChange}:R>\n` : `**Open in**: <t:${nextChange}:R>\n`;
      desc += `**Upcoming Missions:**\n`;
      for (const { open, close } of future.list) desc += `🟢 Open: <t:${open}:R> | 🔴 Close: <t:${close}:R>\n`;
      const embed = await commandEmbed({
        title: "Mission Timer",
        description: desc,
        color: state === "OPEN" ? 0x00ff00 : 0xff0000,
        footer: { text: `Updates every ${config.MISSION_TIMER_INTERVAL || 60}s`, iconURL: bot.user.displayAvatarURL() },
        timestamp: true
      });
      const messages = await channel.messages.fetch({ limit: 10 });
      const exist = messages.find(m => m.author.id === bot.user.id && m.embeds.length > 0);
      if (exist) await exist.edit({ embeds: [embed] });
      else await channel.send({ embeds: [embed] });
    } catch (err) {
      log(`[${thisFile(import.meta.url)}]: ${err.message}`, "error");
    } finally {
      updating = false;
    }
  };
  await update();
  missionInterval = setInterval(update, Math.max(config.MISSION_TIMER_INTERVAL || 60, 30) * 1000);
  log(`[${thisFile(import.meta.url)}] registered.`, "success");
};

export default setupMissionTimer;