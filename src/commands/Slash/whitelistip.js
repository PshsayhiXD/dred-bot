import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('whitelistip')
    .setDescription('Whitelist (unblock) an IP by its index.')
    .addIntegerOption(option => option.setName('index').setDescription('Index from /blacklistedip').setRequired(true))
    .setContexts(['BotDM', 'PrivateChannel']),
  dependencies: `loadData saveData commandEmbed log thisFile`,
  async execute(interaction, user, dep) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const index = interaction.options.getInteger('index');
      const user = await dep.loadData(user.username);
      if (!user) return interaction.editReply({ content: '❌ User not found.' });
      user.account.blockedIP ??= [];
      if (index < 0 || index >= user.account.blockedIP.length) {
        const embed = await dep.commandEmbed({
          title: '❌ Error',
          description: 'Invalid index.',
          reward: false,
          user,
          message: interaction,
        });
        return interaction.editReply({ embeds: [embed] });
      }
      const removed = user.account.blockedIP.splice(index, 1);
      await dep.saveData(user.username, user);
      const embed = await dep.commandEmbed({
        title: '✅ Whitelisted IP',
        description: `Removed blocked IP: \`${removed[0]}\``,
        reward: false,
        user,
        message: interaction,
      });
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      return interaction.editReply(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``);
    }
  },
};
