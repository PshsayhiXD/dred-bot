export default {
  name: 'earnpassive',
  description: 'Claim your passive income.',
  aliases: ['claimpassive', 'income', 'collectincome'],
  usage: '',
  category: 'economy',
  perm: 1,
  cooldown: 60,
  globalCooldown: 1,
  id: 39,
  dependencies: `earnPassiveIncome commandEmbed formatAmount config log 
                 commandButtonComponent Cooldown newCooldown formatTime`,
  execute: async (message, args, user, command, dep) => {
    const result = await dep.earnPassiveIncome(user);
    if (!result.success) {
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: `⏳ You have no passive income to claim right now. Try again later!`,
        color: '#FF0000',
        user,
        message,
        reward: false,
      });
      return message.reply({ embeds: [embed] });
    }
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description:
        `🎁 You claimed **\`${await dep.formatAmount(result.dredcoin)}${dep.config.CURRENCY_SYMBOL}\`** and **\`${result.exp || 0}\`** XP ` +
        `for **${result.minutes}** minute(s) (**${result.seconds}**s) of passive time.\n` +
        `Prestige Bonus: **x${1 + result.prestige * dep.config.PASSIVE_INCOME.MULTIPLIER_PER_PRESTIGE}**\n` +
        `Dredcoin Multipler: **${result.multiplier}x**`,
      color: '#00FF00',
      user,
      message,
      reward: false,
    });
    return message.reply({ embeds: [embed] });
  },
};
