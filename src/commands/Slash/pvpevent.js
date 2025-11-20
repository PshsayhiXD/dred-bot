import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pvpevent')
    .setDescription('Check upcoming Drednot PvP events')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Which event to display')
        .setRequired(true)
        .addChoices(
          { name: 'Next', value: 'next' },
          { name: 'Second', value: 'second' },
          { name: 'Third', value: 'third' },
          { name: 'Fourth', value: 'four' },
          { name: 'Today', value: 'today' },
          { name: 'All', value: 'all' },
          { name: 'Sunday', value: 'sunday' },
          { name: 'Monday', value: 'monday' },
          { name: 'Tuesday', value: 'tuesday' },
          { name: 'Wednesday', value: 'wednesday' },
          { name: 'Thursday', value: 'thursday' },
          { name: 'Friday', value: 'friday' },
          { name: 'Saturday', value: 'saturday' }
        )
    )
    .addBooleanOption(option => option.setName('private').setDescription('Only you can see the result').setRequired(false))
    .setContexts(['Guild', 'BotDM', 'PrivateChannel']),
  dependencies: `pvpEvent commandEmbed log thisFile`,
  async execute(interaction, user, dep) {
    const type = interaction.options.getString('type');
    const isPrivate = interaction.options.getBoolean('private') ?? false;
    await interaction.deferReply({ ephemeral: isPrivate });
    let reply = '';
    try {
      const result = await dep.pvpEvent(type);
      if (result instanceof Error) reply = `❌ ${result.message}`;
      else if (Array.isArray(result))
        reply = result.length
          ? result
              .map((e, i) => {
                const date = typeof e === 'string' ? e : e.date;
                return `#${i + 1}: **${new Date(date).toLocaleString()}**`;
              })
              .join('\n')
          : '❌ No events found.';
      else if (typeof result === 'string') reply = `📅 **${new Date(result).toLocaleString()}**`;
      else reply = '❌ Unexpected data format.';
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      reply = '❌ Failed to retrieve PvP events.';
    }
    const embed = await dep.commandEmbed({
      title: `/pvpevent - ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      description: reply,
      color: '#2f90e0ff',
      user,
      reward: false,
      message: interaction,
    });
    return interaction.editReply({ embeds: [embed] });
  },
};
