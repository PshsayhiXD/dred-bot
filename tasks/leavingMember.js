import { commandEmbed } from "../utils/commandComponent.js";
import config from "../config.js";
import log from '../utils/logger.js';
const setupLeavingMember = async (bot) => {
  bot.on("guildMemberRemove", async (member) => {
    if (member.user.bot) return;
    const channel = bot.channels.cache.get(config.WelcomeChannelID);
    if (!channel || !channel.isTextBased()) return log("[!] Leaving channel not found or invalid", "warn");
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
      log(`[-] ${member.user.tag} left the server.`, "success");
    } catch (err) {
      log(`[!] Failed to send leave message: ${err.message}`, "error");
    }
  });
  log(`[leavingMember.js] registered.`, "success");
};
export default setupLeavingMember;