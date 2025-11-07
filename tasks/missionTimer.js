import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { commandEmbed } from "../utils/commandComponent.js";
import config from "../config.js";
import log from "../utils/logger.js";
import { getFutureMission, getMissionState } from '../utils/helper.js';

log('THIS FILE IS MEMORY-LEAKING, USE AT YOUR OWN RISK.')

let votes = { pits: 0, canary: 0, vulture: 0 };
let voters = new Set();
let lastState = null;

let missionInterval = null;
let updating = false;
const buttonRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("vote_pits").setStyle(ButtonStyle.Primary).setLabel("Pits"),
  new ButtonBuilder().setCustomId("vote_canary").setStyle(ButtonStyle.Success).setLabel("Canary"),
  new ButtonBuilder().setCustomId("vote_vulture").setStyle(ButtonStyle.Danger).setLabel("Vulture")
);
export const newMissionButtons = () => {
  buttonRow.components[0].setLabel(`Pits (${votes.pits})`);
  buttonRow.components[1].setLabel(`Canary (${votes.canary})`);
  buttonRow.components[2].setLabel(`Vulture (${votes.vulture})`);
  return [buttonRow];
};
export const vote = (userId, key, state) => {
  if (state !== "OPEN") return false;
  if (voters.has(userId)) return false;
  votes[key]++;
  voters.add(userId);
  return true;
};
export const setupMissionTimer = async (bot) => {
  if (missionInterval) return;
  const channel = await bot.channels.fetch(config.MissionTimerChannelID);
  if (!channel?.isTextBased()) return log("[setupMissionTimer]: Invalid channel.", "error");
  const update = async () => {
    if (updating) return;
    updating = true;
    try {
      const { state, nextChange } = await getMissionState(config.MISSION_START_TS);
      if (lastState !== state) {
        lastState = state;
        votes = { pits: 0, canary: 0, vulture: 0 };
        voters.clear();
      }
      const emoji = state === "OPEN" ? "✅" : "❌";
      const future = await getFutureMission(config.MISSION_START_TS, config.MISSION_SHOW_FUTURE || 3);
      let desc = `**State**: ${emoji} ${state}\n`;
      desc += state === "OPEN" ? `**Close in**: <t:${nextChange}:R>\n` : `**Open in**: <t:${nextChange}:R>\n`;
      const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
      const currentVote = sorted[0]?.[1] === 0 ? "No votes yet" : `${sorted[0][0][0].toUpperCase() + sorted[0][0].slice(1)} (${sorted[0][1]} votes)`;
      desc += `**Current mission (based on votes)**: ${currentVote}\n`;
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
      if (exist) await exist.edit({ embeds: [embed], components: newMissionButtons() });
      else await channel.send({ embeds: [embed], components: newMissionButtons() });
    } catch (err) {
      log(`[setupMissionTimer]: ${err.message}`, "error");
    } finally {
      updating = false;
    }
  };
  await update();
  missionInterval = setInterval(update, Math.max(config.MISSION_TIMER_INTERVAL || 60, 30) * 1000);
  log("[setupMissionTimer] registered (memory-safe).", "success");
};

export default setupMissionTimer;