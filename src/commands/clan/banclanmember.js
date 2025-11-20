export default {
  name: "banclanmember",
  description: "Ban a user from your clan.",
  aliases: ["clanban", "cban"],
  usage: "<user>",
  category: "clan",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 29,
  dependencies: `banMember isAuthorized getUserClan 
                 commandEmbed config commandButtonComponent commandModal`,
  execute: async (message, args, user, command, dep) => {
    const target = args[0];
    const clanId = (await dep.getUserClan(user)).clan;
    const result = await dep.banMember(user, clanId, target);
    const success = result.banned;
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: success
        ? `✅ Banned \`${target}\` from \`${result.clan}\` by **${result.by}**.`
        : result.error || "❌ Failed to ban the user.",
      color: success ? "#8B0000" : "#FF0000",
      user,
      reward: false,
      message
    });
    const rows = await dep.commandButtonComponent([
      {
        label: "Ban Another User",
        customId: `${command}_useagain_${user}`,
        style: 4,
        emoji: "❌",
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          const modal = await dep.commandModal({
            title: "Ban Clan Member",
            customId: `${command}_modal_${user}`,
            inputs: [{ label: "User", customId: `${command}_target_${user}`, style: 1 }],
            onSubmit: async (mi) => {
              const newTarget = mi.fields.getTextInputValue(`${command}_target_${user}`);
              const clan = (await dep.getUserClan(user)).clan;
              const r = await dep.banMember(user, clan, newTarget);
              if (!r.banned) return mi.reply({ content: r.error || "❌ Failed to ban the user.", ephemeral: true });
              return mi.reply({ content: `✅ Banned \`${newTarget}\` from \`${r.clan}\` by **${r.by}**.`, ephemeral: true });
            }
          });
          await i.showModal(modal);
        }
      }
    ]);
    return message.reply({ embeds: [embed], components: rows });
  }
};