import { commandEmbed } from "../utils/commandComponent.js";
import config from "../config.js";
import thisFile from "../utils/thisFile.js";
import log from '../utils/logger.js';
const setupLeavingMember = async (bot) => {
  bot.on("guildMemberRemove", async (member) => {
    if (member.user.bot) return;
    const channel = bot.channels.cache.get(config.WelcomeChannelID);
    if (!channel || !channel.isTextBased()) return log(`[${thisFile(import.meta.url)}] Leaving channel not found or invalid`, "warn");
    const embed = await commandEmbed({
      title: "👋 A member has left",
      description: `**${member.user.tag}** has left the server.\nWe're now at **${member.guild.memberCount} members**...`,
      color: 0xed4245,
      footer: {
        text: member.user.tag,
        iconURL: member.user.displayAvatarURL()
      },
      timestamp: true
    });
    try {
      await channel.send({ embeds: [embed] });
      log(`[${thisFile(import.meta.url)}] ${member.user.tag} left the server.`, "success");
    } catch (err) {
      log(`[${thisFile(import.meta.url)}] Failed to send leave message: ${err.message}`, "error");
    }
  });
  log(`[${thisFile(import.meta.url)}] registered.`, "success");
};
export default setupLeavingMember;