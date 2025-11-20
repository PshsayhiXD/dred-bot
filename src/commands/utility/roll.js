export default {
  name: 'roll',
  description: 'Roll a dice with the specified number of sides.',
  aliases: ['r'],
  usage: '[sides=6]',
  category: 'utility',
  perm: 0,
  cooldown: 1,
  globalCooldown: 1,
  id: 6,
  dependencies: `commandEmbed config`,
  execute: async (message, args, user, command, dep) => {
    const sides = args[0] ? parseInt(args[0], 10) : 6;
    if (isNaN(sides) || sides <= 0) {
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: `❌ **Provide a valid number of sides for the dice.**\n**Usage**: \`${dep.config.PREFIX}${command} [sides=6]\``,
        color: '#FF0000',
        user,
        reward: true,
        message,
      });
      return message.reply({ embeds: [embed] });
    }
    const roll = Math.floor(Math.random() * sides) + 1;
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: `🎲 **You rolled a ${roll} on a ${sides}-sided dice.**`,
      color: '#00FF00',
      user,
      reward: true,
      message,
    });
    return message.reply({ embeds: [embed] });
  },
};
