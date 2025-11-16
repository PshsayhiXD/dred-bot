import { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { basename } from 'path';

export default {
  data: new SlashCommandBuilder()
    .setName('e621')
    .setDescription('Get an image from e621.net by tag')
    .addStringOption(option => option.setName('tag').setDescription('Search tag').setRequired(true))
    .addBooleanOption(option => option.setName('private').setDescription('Only you can see the result'))
    .setContexts(['Guild', 'BotDM', 'PrivateChannel']),
  dependencies: `log thisFile`,
  async execute(interaction, user, dep) {
    const tag = interaction.options.getString('tag');
    const isPrivate = interaction.options.getBoolean('private') ?? false;
    const isNSFW = interaction.channel?.nsfw ?? false;
    const isGuildNonNSFW = interaction.guild && !isNSFW;
    if (isGuildNonNSFW) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_e621').setLabel('Yes, show it').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cancel_e621').setLabel('No, cancel').setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({
        content: `⚠️ This channel is **not marked NSFW**.\nAre you sure you want to view \`${tag}\` content from e621?`,
        components: [row],
        ephemeral: true,
      });
      try {
        const confirm = await interaction.channel.awaitMessageComponent({
          componentType: ComponentType.Button,
          time: 15000,
          filter: i => i.user.id === interaction.user.id,
        });
        if (confirm.customId === 'cancel_e621') return await confirm.update({ content: '❌ Cancelled.', components: [] });
        await confirm.update({ content: 'Fetching content...', components: [] });
      } catch (e) {
        return interaction.editReply({ content: '❌ No response. Command cancelled.', components: [] });
      }
    } else await interaction.deferReply({ ephemeral: isPrivate });
    try {
      const url = `https://e621.net/posts.json?limit=50&tags=${encodeURIComponent(tag)}`;
      const headers = {
        'User-Agent': 'dredbot (by @pshsayhi4117 on discord)',
      };
      const res = await fetch(url, { headers });
      const data = await res.json();
      const posts = data.posts.filter(p => p.file?.url && !p.tags.general.includes('comic'));
      if (!posts.length) return interaction.editReply({ content: `❌ No results found for \`${tag}\`.` });
      const post = posts[Math.floor(Math.random() * posts.length)];
      const imageUrl = post.file.url;
      const artist = post.tags.artist.join(', ') || 'unknown';
      const rating = post.rating.toUpperCase();
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const name = `SPOILER_e621_${basename(imageUrl.split('?')[0])}`;
      const attachment = new AttachmentBuilder(buffer, { name });
      return interaction.editReply({
        content: `**Tag**: \`${tag}\`\n**Rating:** \`${rating}\`\n**Artist:** \`${artist}\`\n[View on e621](<https://e621.net/posts/${post.id}>)`,
        files: [attachment],
      });
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] error: ${err}`, 'error');
      return interaction.editReply({ content: `❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\`` });
    }
  },
};
