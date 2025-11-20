import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('missiontimer')
    .setDescription('Check for mission cycles.')
    .addIntegerOption(option => option.setName('future').setDescription('How many future cycles to display.').setRequired(false).setMinValue(1).setMaxValue(10))
    .addBooleanOption(option => option.setName('private').setDescription('Only you can see the result.').setRequired(false)),
  dependencies: `commandEmbed log getMissionState getFutureMission thisFile`,
  async execute(interaction, user, dep) {
    const futureCount = interaction.options.getInteger('future') ?? 3;
    const isPrivate = interaction.options.getBoolean('private') ?? false;
    await interaction.deferReply({ ephemeral: isPrivate });
    let reply = '';
    try {
      const { state, nextChange } = dep.getMissionState();
      const future = dep.getFutureMission(futureCount);
      const stateEmoji = state === 'OPEN' ? '✅' : '❌';
      reply += `**Current State**: ${stateEmoji} ${state}\n`;
      reply += state === 'OPEN' ? `**Closes in**: <t:${nextChange}:R>\n` : `**Opens in**: <t:${nextChange}:R>\n`;
      reply += `\n**Upcoming Missions:**\n`;
      future.forEach((f, i) => {
        reply += `#${i + 1} 🟢 Open: <t:${f.open}:R> | 🔴 Close: <t:${f.close}:R>\n`;
      });
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      reply = '❌ Failed to retrieve mission timer.';
    }
    const embed = await dep.commandEmbed({
      title: `/missiontimer`,
      description: reply,
      color: '#2f90e0ff',
      user,
      reward: false,
      message: interaction,
    });
    return interaction.editReply({ embeds: [embed] });
  },
};
