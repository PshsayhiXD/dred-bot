import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sfn')
    .setDescription('Search for a function (DEV)')
    .addStringOption(option =>
      option.setName('search')
        .setDescription('Function name or "all"')
        .setRequired(true)
    ).setContexts(['Guild', 'BotDM', 'PrivateChannel']),
  dependencies: 'helper commandEmbed config Permission',
  async execute(interaction, user, dep) {
    const allowed = await dep.Permission(user, "get", "3>=");
    if (!allowed) return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    const query = interaction.options.getString('search').toLowerCase();
    const allFunctions = Object.keys(dep.helper).filter(k => typeof dep.helper[k] === 'function');
    const matches = query === 'all' ? allFunctions : allFunctions.filter(fn => fn.toLowerCase().includes(query));
    if (!matches.length) return interaction.reply({ content: '❌ No matching functions found.', ephemeral: true });
    const output = matches.join('\n');
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}sfn ${query}`,
      description: `**Found ${matches.length} function(s)**:\n\`\`\`js\n${output}\n\`\`\``,
      color: '#00FF00',
      user,
      reward: false,
      message: interaction
    });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};