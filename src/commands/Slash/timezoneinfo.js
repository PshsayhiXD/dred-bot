import { SlashCommandBuilder } from 'discord.js';
import { DateTime } from 'luxon';

export default {
  data: new SlashCommandBuilder()
    .setName('timezoneinfo')
    .setDescription('Get the current time at timezone')
    .addStringOption(option =>
      option.setName('zone')
        .setDescription('Timezone (e.g. America/New_York)')
        .setRequired(true)
    ).setContexts(['Guild', 'BotDM', 'PrivateChannel']),
    dependencies: `commandEmbed`,
  async execute(interaction, user, dep) {
    const zone = interaction.options.getString('zone');
    const time = DateTime.now().setZone(zone);
    await interaction.deferReply();
    if (!time.isValid) {
      return interaction.editReply({
        content: `❌ Invalid timezone`,
      });
    }
    const embed = await dep.commandEmbed({
      title: `Timezone ${zone}`,
      description: [
        `🌍 **Timezone**: \`${zone}\``,
        `🕒 **Current Time**: \`${time.toFormat('cccc, dd LLL yyyy • HH:mm:ss')}\``,
        `🧭 **UTC Offset**: \`UTC${time.toFormat('Z')}\``,
        `📛 **Abbreviation**: \`${time.offsetNameShort}\``,
        `🌐 **Daylight Saving**: \`${time.isInDST ? 'Yes' : 'No'}\``
      ].join('\n'),
      reward: true,
      user,
      message: interaction,
    });
    interaction.editReply({ embeds: [embed] });
  }
};
