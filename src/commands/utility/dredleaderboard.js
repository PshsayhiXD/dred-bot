export default {
  name: "dredleaderboard",
  description: "Displays the Drednot.io leaderboard.",
  usage: "<category> [by=pilot] [page=1]",
  aliases: ["dredlb", "drednotleaderboard", "drednotlb"],
  category: "utility",
  cooldown: 10,
  globalCooldown: 0,
  perm: 0,
  id: 61,
  dependencies: `commandEmbed log config getDrednotLeaderboard`,
  execute: async (message, args, user, command, dep) => {
    const category = args[0];
    const by = args[1] || "pilot";
    const page = parseInt(args[2]) || 1;
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: `Fetching leaderboard for category **\`${category}\`**... Please be patient...`,
      user,
      reward: false,
      message,
    });
    const msg = await message.channel.send({ embeds: [embed] });
    const lb = await dep.getDrednotLeaderboard(category, by, page);
    if (!lb.ok) {
      await msg.delete().catch(() => {});
      embed.setDescription(`❌ ${lb.err || "An unknown error occurred."}`);
      embed.setColor("#FF0000");
      return await message.channel.send({ embeds: [embed] });
    }
    await msg.delete().catch(() => {});
    const entries = Object.values(lb.leaderboard).slice(0, 100);
    if (!entries.length) return message.react("⚠");
    embed.setDescription(
      `- Category: **\`${lb.meta.category}\`** | By: **\`${lb.meta.by}\`** | Page: **\`${lb.meta.page}\`**\n` +
      entries.map(e => `**${e.rank}** \`${e.name}\` - \`${e.score}\`.`).join("\n")
    );
    embed.setColor("#00FF00");
    return await message.channel.send({ embeds: [embed] });
  }
};