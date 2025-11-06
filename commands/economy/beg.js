export default {
  name: "beg",
  description: "Beg for Dredcoin and EXP.",
  aliases: ["be","bg"],
  usage: "",
  category: "economy",
  perm: 0,
  cooldown: 60,
  globalCooldown: 1,
  id: 38,
  dependencies: `commandEmbed formatAmount config randomNumber 
                 commandButtonComponent Cooldown newCooldown formatTime`,
  execute: async (message, args, user, command, dep) => {
    const doBeg = async () => {
      const begged = await dep.randomNumber() >= 0.5;
      if (!begged) {
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command}`,
          description: "You tried to beg, but no one helped you...",
          color: "#FF0000",
          user,
          reward: false,
          message
        });
        return { embeds: [embed] };
      }
      const amount = Math.floor(await dep.randomNumber(dep.config.BEG_MIN, dep.config.BEG_MAX));
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: `You begged and received **\`${await dep.formatAmount(amount)}${dep.config.CURRENCY_SYMBOL}\`**!`,
        color: "#00FF00",
        user,
        reward: true,
        message
      });
      return { embeds: [embed] };
    };
    const result = await doBeg();
    const buttons = await dep.commandButtonComponent([
      {
        label: "Beg Again",
        customId: `${command}_useagain_${user}`,
        style: 1,
        emoji: "🔁",
        onClick: async (interaction) => {
          if (interaction.user.id !== message.author.id) return;
          const cooldown = await dep.Cooldown(user, command);
          if (cooldown) {
            return interaction.reply({
              content: `⏳ You must wait **${await dep.formatTime(cooldown.remaining)}** before begging again.`,
              ephemeral: true
            });
          }
          await dep.newCooldown(user, command, 60);
          const newResult = await doBeg();
          await interaction.update({ ...newResult, components: buttons });
        }
      }
    ]);
    return message.reply({ ...result, components: buttons });
  }
};