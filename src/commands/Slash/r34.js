import { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { basename } from 'path';

export default {
  data: new SlashCommandBuilder()
    .setName('r34')
    .setDescription('Get an image or sound from Rule34 by tag/category')
    .addStringOption(option => option.setName('tag').setDescription('Tag to search (e.g. femboy)').setRequired(true))
    .addBooleanOption(option => option.setName('private').setDescription('Only you can see the result').setRequired(false))
    .setContexts(['Guild', 'BotDM', 'PrivateChannel']),
  dependencies: `log thisFile`,
  async execute(interaction, user, dep) {
    const tag = interaction.options.getString('tag');
    const isPrivate = interaction.options.getBoolean('private') ?? false;
    const isNSFW = interaction.channel?.nsfw ?? false;
    const type = interaction.channel?.type;
    const isGuildNonNSFW = interaction.guild && !isNSFW;
    if (isGuildNonNSFW) {
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('confirm_r34').setLabel('Yes, show it').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('cancel_r34').setLabel('No, cancel').setStyle(ButtonStyle.Secondary));
      await interaction.reply({
        content: `⚠️ This channel is **not marked NSFW**.\nAre you sure you want to view \`${tag}\` content from Rule34?`,
        components: [row],
        ephemeral: true,
      });
      try {
        const confirm = await interaction.channel.awaitMessageComponent({
          componentType: ComponentType.Button,
          time: 15000,
          filter: i => i.user.id === interaction.user.id,
        });
        if (confirm.customId === 'cancel_r34') return await confirm.update({ content: '❌ Cancelled.', components: [] });
        await confirm.update({ content: 'Fetching content...', components: [] });
      } catch (e) {
        return interaction.editReply({ content: '❌ No response. Command cancelled.', components: [] });
      }
    } else await interaction.deferReply({ ephemeral: isPrivate });
    const url = `https://rule34.xxx/index.php?page=dapi&s=post&q=index&limit=100&json=1&tags=${encodeURIComponent(tag)}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data?.length) return interaction.editReply({ content: `❌ No results found for \`${tag}\`.` });
      const post = data[Math.floor(Math.random() * data.length)];
      if (!post.file_url) return interaction.editReply({ content: `❌ No valid file found for \`${tag}\`.` });
      const fileUrl = post.file_url.startsWith('http') ? post.file_url : `https:${post.file_url}`;
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const name = `SPOILER_${basename(fileUrl.split('?')[0])}`;
      const attachment = new AttachmentBuilder(buffer, { name });
      return interaction.editReply({
        content: `\`${tag}\``,
        files: [attachment],
      });
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      return interaction.editReply({ content: `❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\`` });
    }
  },
};
