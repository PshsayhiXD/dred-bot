export default {
  name: "earnpassive",
  description: "Claim your passive income.",
  aliases: ["claimpassive","income","collect"],
  usage: "",
  category: "economy",
  perm: 1,
  cooldown: 60,
  globalCooldown: 1,
  id: 39,
  dependencies: `earnPassiveIncome commandEmbed formatAmount config log 
                 commandButtonComponent Cooldown newCooldown formatTime`,
  execute: async (message, args, user, command, dep) => {
    const doClaim = async () => {
      const result = await dep.earnPassiveIncome(user);
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description:
          `🎁 You claimed **\`${await dep.formatAmount(result.dredcoin)}${dep.config.CURRENCY_SYMBOL}\`** and **\`${result.earnedExp || 0}\`** XP ` +
          `for **${result.minutes}** minute(s) (**${result.seconds}**s) of passive time.\n` +
          `Prestige Bonus: **x${1 + result.prestige * dep.config.PASSIVE_INCOME.MULTIPLIER_PER_PRESTIGE}**\n` +
          `Dredcoin Multipler: **${result.multiplier}x**`,
        color: "#00FF00",
        user,
        message,
        reward: false
      });
      return { embeds: [embed] };
    };
    try {
      const result = await doClaim();
      const buttons = await dep.commandButtonComponent([
        {
          label: "Claim Again",
          customId: `${command}_useagain_${user}`,
          style: 1,
          emoji: "🔁",
          onClick: async (interaction) => {
            if (interaction.user.id !== message.author.id) return;
            const cooldown = await dep.Cooldown(user, command);
            if (cooldown) {
              return interaction.reply({
                content: `⏳ You must wait **${dep.formatTime(cooldown.remaining)}** before claiming again.`,
                ephemeral: true
              });
            }
            await dep.newCooldown(user, command, 60);
            const newResult = await doClaim();
            await interaction.update({ ...newResult, components: buttons });
          }
        }
      ]);
      return message.reply({ ...result, components: buttons });
    } catch (err) {
      dep.log(`[earnpassive] ${err.stack}`, "error");
      return message.reply(`❌ [earnpassive]: \`${err.message}\``);
    }
  }
};