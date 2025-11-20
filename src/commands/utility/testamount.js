export default {
  name: 'testamount',
  description: 'test parseAmount and formattedAmount function.',
  aliases: ['ta'],
  usage: '<amount>',
  category: 'utility',
  perm: 0,
  cooldown: 1,
  globalCooldown: 1,
  id: 7,
  dependencies: `commandEmbed parseAmount formatAmount config`,
  execute: async (message, args, user, command, dep) => {
    const amount = args[0];
    const parsedAmount = await dep.parseAmount(amount);
    const formattedAmount = await dep.formatAmount(parsedAmount);
    const emoj = amount => {
      if (amount === undefined || amount === null) return '❌';
      else if (amount <= 0 || isNaN(amount)) return '❗';
      else return '✅';
    };
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: `${emoj(parsedAmount)} **Parsed Amount**: \`${parsedAmount}\`\n${emoj(formattedAmount)} **Formatted Amount**: \`${formattedAmount}\``,
      color: '#00FF00',
      user: user,
      reward: true,
      message,
    });
    return message.reply({ embeds: [embed] });
  },
};
