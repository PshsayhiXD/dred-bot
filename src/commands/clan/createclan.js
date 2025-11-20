export default {
  name: "createclan",
  description: "Create a new clan.",
  aliases: ['crcl'],
  usage: "<name>",
  category: "clan",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 21,
  dependencies: `createClan commandEmbed config`,
  execute: async (message, args, user, command, dep) => {
    const clanName = args.join(" ")?.trim();
    const result = dep.createClan(user, clanName);
    if (!result.created) return message.reply({ embeds: [await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: result.error,
      color: '#ff0000',
      user,
      reward: false,
      message,
    })] });
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: `✅ Clan \`${clanName}\` has been created successfully!`,
      color: '#00ff00',
      user,
      reward: true,
      message
    });
    return message.reply({ embeds: [embed] });
  }
};