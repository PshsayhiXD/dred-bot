export default {
  name: 'spotify',
  description: 'Search for a song on Spotify',
  aliases: ['spot', 'sp'],
  usage: '<songName> [artistName]',
  category: 'utility',
  perm: 0,
  cooldown: 10,
  globalCooldown: 1,
  id: 8,
  dependencies: `commandEmbed searchSpotify
                log formatTime config thisFile`,
  execute: async (message, args, user, command, dep) => {
    if (!args.length) {
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: `❌ **Provide a song name to search for.**\n**Usage**: \`${dep.config.PREFIX}${command} <songName> [artistName]\``,
        color: '#FF0000',
        user,
        reward: true,
        message,
      });
      return message.reply({ embeds: [embed] });
    }
    const songName = args[0];
    const artistName = args.length > 1 ? args.slice(1).join(' ') : '';
    try {
      const tracks = await dep.searchSpotify(songName, artistName, 10);
      if (!tracks.length) return message.reply('❌ No results found.');
      let exactTrack = tracks.find(track => track.name.toLowerCase() === songName.toLowerCase() && (!artistName || track.artists.some(a => a.name.toLowerCase().includes(artistName.toLowerCase()))));
      const track = exactTrack || tracks[0];
      const bestresult = exactTrack ? '🎵  ' : '🔍 **Best Match:** ';
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
        const time = duration.split(':');
        return clocks[`${time[0]}:00`] || '🕛';
      };
      const durationStr = msToTime(track.duration_ms);
      const clockEmoji = clock(durationStr);
      const embed = await await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: `
          ${bestresult}**${track.name}** By **${track.artists.map(artist => artist.name).join(', ')}**\n
          💿 **Album** ${track.album.name}\n
          ${clockEmoji} **Duration** ${dep.formatTime(track.duration_ms)}\n
          🔗 **Link** ${track.external_urls.spotify}
        `,
        thumbnail: track.album.images[0]?.url || '',
        color: '#00FF00',
        user,
        reward: true,
        message,
      });
      return message.reply({ embeds: [embed] });
    } catch (err) {
      log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      return message.reply(`❌ [${dep.thisFile(import.meta.url)}] ${err.message}`);
    }
  },
};
