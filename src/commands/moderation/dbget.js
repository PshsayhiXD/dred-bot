export default {
  name: "dbget",
  description: "Get a value from a user's data.",
  aliases: [],
  usage: "<userId> <path>",
  category: "moderation",
  perm: 4,
  cooldown: 0,
  globalCooldown: 0,
  id: 71,
  dependencies: "loadData commandEmbed commandButtonComponent config",
  execute: async (message, args, user, command, dep) => {
    const [userId, path] = args;
    const getValue = async () => {
      const data = await dep.loadData(userId);
      const keys = path.split(".");
      let obj = data;
      for (const key of keys) {
        if (typeof obj !== "object" || obj === null) return undefined;
        obj = obj[key];
      }
      return obj;
    };
    const value = await getValue();
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} ${args.join(" ")}`,
      description: value === undefined
        ? `❌ Path \`${path}\` not found for user \`${userId}\`.`
        : `✅ Value at \`${path}\` for user \`${userId}\`:\n\`\`\`js\n${JSON.stringify(value, null, 2)}\n\`\`\``,
      color: value === undefined ? "#FF0000" : "#00FF00",
      user,
      reward: false,
      message
    });
    const buttons = await dep.commandButtonComponent([
      {
        label: "🔄 Refresh",
        style: 2,
        onClick: async (interaction) => {
          if (interaction.user.id !== message.author.id) return interaction.reply({ content: "❌ This isn’t your command.", ephemeral: true });
          try {
            const newValue = await getValue();
            const newEmbed = await dep.commandEmbed({
              title: embed.title,
              description: newValue === undefined
                ? `❌ Path \`${path}\` not found for user \`${userId}\`.`
                : `✅ Value at \`${path}\` for user \`${userId}\`:\n\`\`\`js\n${JSON.stringify(newValue, null, 2)}\n\`\`\``,
              color: newValue === undefined ? "#FF0000" : "#00FF00",
              user,
              reward: false,
              message
            });
            await interaction.update({ embeds: [newEmbed] });
          } catch (err) {
            await interaction.reply({ content: `❌ Error: \`${err.message}\``, ephemeral: true });
          }
        }
      }
    ]);
    return message.reply({ embeds: [embed], components: buttons });
  }
};