import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('gemini')
    .setDescription('Ask Gemini flash 1.5 latest a question')
    .addStringOption(option => option.setName('prompt').setDescription('Your question to Gemini').setRequired(true))
    .setContexts(['Guild', 'BotDM', 'PrivateChannel']),
  dependencies: `commandEmbed readEnv log thisFile`,
  async execute(interaction, user, dep) {
    const input = interaction.options.getString('prompt');
    const key = await dep.readEnv('GEMINI_API_KEY');
    await interaction.deferReply();
    const loadingEmbed = await dep.commandEmbed({
      title: `/gemini`,
      description: `🕑 Generating... Please be patient...`,
      user,
      reward: false,
      message: interaction,
    });
    await interaction.editReply({ embeds: [loadingEmbed] });
    let reply = '';
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: input }] }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        dep.log(`[${dep.thisFile(import.meta.url)} res] ${err}`, 'error');
        reply = '❌ Failed to get a response from Gemini.';
      } else {
        const json = await res.json();
        reply = json.candidates?.[0]?.content?.parts?.[0]?.text || '❌ No response received.';
      }
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] ${err.message}`, 'error');
      reply = '❌ An unexpected error occurred while contacting Gemini.';
    }
    const resultEmbed = await dep.commandEmbed({
      title: input,
      description: reply.length > 3900 ? reply.slice(0, 3900) + '...' : reply,
      user,
      reward: true,
      message: interaction,
    });
    return interaction.editReply({ embeds: [resultEmbed] });
  },
};
