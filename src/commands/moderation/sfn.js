export default {
  name: 'sfn',
  description: 'Search for a function.',
  aliases: [],
  usage: '<func/"all">',
  category: 'moderation',
  perm: 4,
  cooldown: 1,
  globalCooldown: 1,
  id: 20,
  dependencies: 'helper commandEmbed config',
  execute: async (message, args, user, command, dep) => {
    const query = args.join(' ').toLowerCase();
    if (!query) return;
    const allKeys = Object.keys(dep.helper).filter(k => typeof dep.helper[k] === 'function');
    const matches = query === 'all' ? allKeys : allKeys.filter(name => name.toLowerCase().includes(query));
    if (!matches.length) return message.react('❌');
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} ${query}`,
      description: `**Found ${matches.length} function(s):**\n\`\`\`js\n${matches.join('\n')}\n\`\`\``,
      color: '#00FF00',
      user,
      reward: false,
      message
    });
    return message.reply({ embeds: [embed] });
  }
};