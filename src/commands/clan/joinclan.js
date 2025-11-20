export default {
  name: "joinclan",
  description: "Join a clan by name.",
  aliases: ['jcl'],
  usage: "<clan> [password]",
  category: "clan",
  perm: 0,
  cooldown: 0,
  globalCooldown: 43200,
  id: 23,
  dependencies: `joinClan commandEmbed config`,
  execute: async (message, args, user, command, dep) => {
    const [clan, password] = args;
    const result = dep.joinClan(user, clan, password || null);
    if (!result?.joined) {
      return message.reply({ embeds: [await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: result.error,
        color: "#ff0000",
        user,
        reward: false,
        message,
      })] });
    }
    const description = result.joined === "pending" ? `Request to join **${clan}** sent.` : `You joined **${clan}**!`;
    return message.reply({ embeds: [await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description,
      color: "#00FF00",
      user,
      reward: true,
      message,
    })] });
  }
};