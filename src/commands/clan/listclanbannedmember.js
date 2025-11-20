export default {
  name: "listbannedmembers",
  description: "List banned users from your clan.",
  aliases: ["clanbans", "clban"],
  usage: "",
  category: "clan",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 31,
  dependencies: `listBannedMembers getUserClan commandEmbed config commandButtonComponent`,
  execute: async (message, args, user, command, dep) => {
    const clanId = (await dep.getUserClan(user)).clan;
    const result = await dep.listBannedMembers(user, clanId);
    const success = result.success;
    const banned = success ? result.banned || [] : [];
    const content = !success
      ? result.error || "❌ Failed to get banned members."
      : (banned.length ? banned.map(u => `• \`${u}\``).join("\n") : "✅ No banned users in this clan.");
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} - Banned Users`,
      description: content,
      color: success ? "#FFA500" : "#FF0000",
      user,
      reward: false,
      message
    });
    const rows = await dep.commandButtonComponent([
      {
        label: "Refresh",
        customId: `${command}_refresh_${user}`,
        style: 2,
        emoji: "🔁",
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          const clan = (await dep.getUserClan(user)).clan;
          const r = await dep.listBannedMembers(user, clan);
          if (!r.success) return i.reply({ content: r.error || "❌ Failed to refresh banned members.", ephemeral: true });
          const b = r.banned || [];
          const c = b.length ? b.map(u => `• \`${u}\``).join("\n") : "✅ No banned users in this clan.";
          const e = await dep.commandEmbed({
            title: `${dep.config.PREFIX}${command} - Banned Users`,
            description: c,
            color: "#FFA500",
            user,
            reward: false,
            message
          });
          return i.reply({ embeds: [e], ephemeral: true });
        }
      }
    ]);
    return message.reply({ embeds: [embed], components: rows });
  }
};