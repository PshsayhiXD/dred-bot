export default {
  name: "69",
  description: "69.",
  aliases: ["sixtynine", "sextonight"],
  usage: "",
  category: "joke",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 69,
  dependencies: "commandEmbed config",
  execute: async (message, args, user, command, dep) => {
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: "When",
      color: "#FF69B4",
      user,
      reward: false,
      message
    });
    return message.reply({ embeds: [embed] });
  }
};