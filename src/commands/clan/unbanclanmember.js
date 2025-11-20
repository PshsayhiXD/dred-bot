export default {
  name: "unbanclanmember",
  description: "Unban a user from your clan.",
  aliases: ["clanunban", "cunban"],
  usage: "<user>",
  category: "clan",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 30,
  dependencies: `unbanMember getUserClan commandEmbed config commandButtonComponent commandModal`,
  execute: async (message, args, user, command, dep) => {
    const targetId = args[0];
    const clanId = (await dep.getUserClan(user)).clan;
    const result = dep.unbanMember(user, clanId, targetId);
    if (!result.unbanned) {
      return message.reply({ embeds: [await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: result.error || "❌ Failed to unban the user.",
        color: "#FF0000",
        user,
        reward: false,
        message
      })] });
    }
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: `✅ Unbanned \`${targetId}\` from \`${result.clan}\` by **${result.by}**.`,
      color: "#00FF00",
      user,
      reward: false,
      message
    });
    const rows = await dep.commandButtonComponent([
      {
        label: "Unban Another User",
        customId: `${command}_unbananother_${user}`,
        style: 1,
        emoji: "⭕",
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          const modal = await dep.commandModal({
            title: "Unban User",
            customId: `unbanclanmember_modal_${user}`,
            inputs: [
              { label: "User ID", customId: `unbanclanmember_user_${user}`, style: 1 }
            ],
            onSubmit: async (mi) => {
              const tId = mi.fields.getTextInputValue(`unbanclanmember_user_${user}`);
              const r = dep.unbanMember(user, clanId, tId);
              if (!r.unbanned) return mi.reply({ content: r.error || "❌ Failed to unban.", ephemeral: true });
              const e = await dep.commandEmbed({
                title: `${dep.config.PREFIX}${command}`,
                description: `✅ Unbanned \`${tId}\` from \`${r.clan}\` by **${r.by}**.`,
                color: "#00FF00",
                user,
                reward: false,
                message
              });
              return mi.reply({ embeds: [e], ephemeral: true });
            }
          });
          await i.showModal(modal);
        }
      }
    ]);
    return message.reply({ embeds: [embed], components: rows });
  }
};