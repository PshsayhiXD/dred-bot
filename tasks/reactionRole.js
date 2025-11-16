import config from "../config.js";
import log from "../utils/logger.js";
import { commandButtonComponent, commandEmbed } from "../utils/commandComponent.js";
import thisFile from "../utils/thisFile.js";
const setupReactionRoles = async (bot) => {
  const channel = await bot.channels.fetch(config.reactionRoleChannelID).catch(() => null);
  if (!channel?.isTextBased()) return log(`[${thisFile(import.meta.url)}] Invalid channel`, "warn");
  const messages = await channel.messages.fetch({ limit: 10 }).catch(() => []);
  const existing = messages.find(m => m.author.id === bot.user.id && m.embeds.length > 0);
  const fields = Object.values(config.ReactionRoles).map(({ label, role }) => ({
    name: label,
    value: `<@&${role}>`,
    inline: true
  }));
  const embed = await commandEmbed({
    title: "Choose Your Roles",
    description:
      "Customize your experience by picking the roles that apply to you.\n\nClick a button below to toggle a role on or off.",
    color: "#4e5d94",
    fields,
    footer: { text: "Changes apply instantly • You can always come back to update this." }
  });
  const buttonDefs = Object.values(config.ReactionRoles).map(({ label, role }) => ({
    label,
    customId: `role_${role}`,
    style: 2
  }));
  const rows = await commandButtonComponent(buttonDefs);
  if (existing) await existing.edit({ embeds: [embed], components: rows });
  else await channel.send({ embeds: [embed], components: rows });
  log(`[${thisFile(import.meta.url)}] registered.`, "success");
};

export default setupReactionRoles;