import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('spotify')
    .setDescription('Search for a song on Spotify')
    .addStringOption(option => option.setName('song').setDescription('Song name to search for').setRequired(true))
    .addStringOption(option => option.setName('artist').setDescription('artist name').setRequired(false))
    .setContexts(['Guild', 'BotDM', 'PrivateChannel']),
  dependencies: `searchSpotify formatTime commandEmbed log thisFIle`,
  async execute(interaction, user, dep) {
    const songName = interaction.options.getString('song');
    const artistName = interaction.options.getString('artist') ?? '';
    await interaction.deferReply();
    try {
      const tracks = await dep.searchSpotify(songName, artistName, 10);
      if (!tracks.length) return interaction.editReply({ content: `❌ No results found.` });
      let exactTrack = tracks.find(track => track.name.toLowerCase() === songName.toLowerCase() && (!artistName || track.artists.some(a => a.name.toLowerCase().includes(artistName.toLowerCase()))));
      const track = exactTrack || tracks[0];
      const bestResult = exactTrack ? '🎵 ' : '🔍 **Best Match:** ';
      const msToTime = ms => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60)
          .toString()
          .padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
      };
      const clock = duration => {
        const clocks = {
          '00:00': '🕛',
          '01:00': '🕐',
          '02:00': '🕑',
          '03:00': '🕒',
          '04:00': '🕓',
          '05:00': '🕔',
          '06:00': '🕕',
          '07:00': '🕖',
          '08:00': '🕗',
          '09:00': '🕘',
          '10:00': '🕙',
        };
        const [m] = duration.split(':');
        return clocks[`${m.padStart(2, '0')}:00`] || '🕛';
      };
      const durationStr = msToTime(track.duration_ms);
      const clockEmoji = clock(durationStr);
      const embed = await dep.commandEmbed({
        title: `${songName} by ${artistName}`,
        description: `
          ${bestResult}**${track.name}** by **${track.artists.map(a => a.name).join(', ')}**
          💿 **Album**: ${track.album.name}
          ${clockEmoji} **Duration**: ${dep.formatTime(track.duration_ms)}
          🔗 **Link**: ${track.external_urls.spotify}
        `,
        thumbnail: track.album.images[0]?.url || '',
        user,
        reward: true,
        message: interaction,
      });
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] error: ${err.message}`, 'error');
      return interaction.editReply({ content: `❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\`` });
    }
  },
};
