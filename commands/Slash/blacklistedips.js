import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('blacklistedips').setDescription('View your blacklisted IPs.').setContexts(['BotDM', 'PrivateChannel']),
  dependencies: `loadData commandEmbed log thisFile`,
  async execute(interaction, user, dep) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const user = await dep.loadData(user.username);
      if (!user) return;
      const ips = user.account.blockedIP ?? [];
      if (ips.length === 0) {
        const embed = await dep.commandEmbed({
          title: '✅ No Blacklisted IPs',
          description: "You don't have any blocked IPs.",
          reward: false,
          user,
          message: interaction,
        });
        return interaction.editReply({ embeds: [embed] });
      }
      const embed = await dep.commandEmbed({
        title: '🚫 Blocked IPs',
        description: ips.map((ip, i) => `\`${i}\` → \`${ip}\``).join('\n'),
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
