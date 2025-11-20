export default {
  name: "kickclanmember",
  description: "Kick a user from your clan.",
  aliases: ["clankick", "ckick"],
  usage: "<user>",
  category: "clan",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 28,
  dependencies: `kickMember getUserClan commandEmbed config commandButtonComponent commandModal`,
  execute: async (message, args, user, command, dep) => {
    const target = args[0];
    const clanId = (await dep.getUserClan(user)).clan;
    const result = await dep.kickMember(user, clanId, target);
    const success = result.kicked;
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: success
        ? `✅ Kicked user \`${target}\` from \`${result.clan}\` by **${result.by}**.`
        : result.error || "❌ Failed to kick the user.",
      color: success ? "#FFA500" : "#FF0000",
      user,
      reward: false,
      message
    });
    const rows = await dep.commandButtonComponent([
      {
        label: "Kick Another User",
        customId: `${command}_kickanother_${user}`,
        style: 4,
        emoji: "❌",
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          const modal = await dep.commandModal({
            title: "Kick Clan Member",
            customId: `${command}_modal_${user}`,
            inputs: [
              { label: "User", customId: `${command}_target_${user}`, style: 1 }
            ],
            onSubmit: async (mi) => {
              const newTarget = mi.fields.getTextInputValue(`${command}_target_${user}`);
              const clan = (await dep.getUserClan(user)).clan;
              const r = await dep.kickMember(user, clan, newTarget);
              if (!r.kicked) return mi.reply({ content: r.error || "❌ Failed to kick the user.", ephemeral: true });
              return mi.reply({ content: `✅ Kicked user \`${newTarget}\` from \`${r.clan}\` by **${r.by}**.`, ephemeral: true });
            }
          });
          await i.showModal(modal);
        }
      }
    ]);
    return message.reply({ embeds: [embed], components: rows });
  }
};