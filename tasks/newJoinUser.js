import { commandEmbed } from "../utils/commandComponent.js";
import log from "../utils/logger.js";
import config from "../config.js";
import thisFile from "../utils/thisFile.js";
const setupNewJoinMember = async (bot) => {
  const roleId = config.NEWMEMBER_ROLEID;
  const welcomeChannelId = config.WelcomeChannelID;
  bot.on("guildMemberAdd", async (member) => {
    const role = member.guild.roles.cache.get(roleId);
    if (!role) return log(`[${thisFile(import.meta.url)}]: ${roleId} not found.`, "warn");
    try {
      await member.roles.add(role);
      log(`[${thisFile(import.meta.url)}] Assigned role to ${member.user.tag}`, "success");
    } catch (err) {
      log(`[${thisFile(import.meta.url)}] Failed to assign role to ${member.user.tag}: ${err}`, "error");
    }
    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
    if (!welcomeChannel?.isTextBased?.()) return;
    const embed = await commandEmbed({
      title: "👋 Welcome aboard!",
      description: `Hey <@${member.id}>, welcome to **${member.guild.name}**!`,
      color: 0x57f287,
      thumbnail: member.user.displayAvatarURL({ dynamic: true }),
      fields: [
        { name: "Member", value: `**Tag:** \`${member.user.tag} (${member.id})\``, inline: true },
        { name: "📆 Joined", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
        { name: "📊 Server Stats", value: `**Total Members:** ${member.guild.memberCount}`, inline: true },
        { name: "📖 Start Here", value: `- Check out <#${config.RulesChannelID}> to get started.`, inline: false },
        { name: "🔗 Useful Channels", value: `<#1343918179893903454> • <#1342150282842341416> • <#1342150461905567796> • <#1354075235552464897>.`, inline: false }
      ],
      footer: { text: `Welcome ${member.user.username}!`, iconURL: member.user.displayAvatarURL({ dynamic: true }) },
      timestamp: true
    });
    welcomeChannel.send({ embeds: [embed] }).catch(() => {});
  });
  const guild = bot.guilds.cache.get(config.GUILD_ID);
  if (!guild) return;
  const role = guild.roles.cache.get(roleId);
  if (!role) return log(`[${thisFile(import.meta.url)}] Role ${roleId} not found.`, "warn");
  const members = await guild.members.fetch();
  const toUpdate = members.filter(m => !m.user.bot && !m.roles.cache.has(roleId));
  log(`[${thisFile(import.meta.url)}] Assigning role to ${toUpdate.size} members.`, "success");
  for (const member of toUpdate.values()) {
    try {
      await member.roles.add(role);
      log(`[${thisFile(import.meta.url)}] Assigned role to ${member.user.tag}.`, "success");
    } catch (err) {
      log(`[${thisFile(import.meta.url)}] Failed to assign role to ${member.user.tag}: ${err.message}`, "warn");
    }
  }
  log(`[${thisFile(import.meta.url)}] registered.`, "success");
};

export default setupNewJoinMember;