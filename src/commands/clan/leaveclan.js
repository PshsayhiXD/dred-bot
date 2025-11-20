export default {
  name: "leaveclan",
  description: "Leave your current clan.",
  aliases: ['lcl'],
  usage: "",
  category: "clan",
  perm: 0,
  cooldown: 0,
  globalCooldown: 43200,
  id: 24,
  dependencies: `leaveClan commandEmbed config`,
  execute: async (message, args, user, command, dep) => {
    const result = dep.leaveClan(user);
    if (!result.left) return message.reply({ embeds: [await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: result.error,
        color: "#FF0000",
        user,
        reward: false,
        message
      })] });
    return message.reply({ embeds: [await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: `✅ **You left** the clan \`${result.clan}\`.`,
      color: "#00FF00",
      user,
      reward: true,
      message
    })] });
  }
};