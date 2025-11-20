export default {
  name: 'marketplacecancel',
  description: 'Cancel your marketplace listings.',
  aliases: ['marketplacedelete', 'mpc', 'mpd'],
  usage: '<listingId>',
  category: 'marketplace',
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 43,
  dependencies: `cancelListing commandEmbed config log thisFile`,
  execute: async (message, args, user, command, dep) => {
    const [listingId] = args;
    try {
      const result = await dep.cancelListing(user, listingId);
      if (typeof result === 'string') return message.reply(result);
      const { restoredItem } = result;
      const name = restoredItem.name || restoredItem.id || 'Unknown';
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: `✅ Your listing \`${listingId}\` was canceled.\n` + `🎒 Restored: **\`${restoredItem.count || 1}x ${name}\`** to your inventory.`,
        color: '#FFD700',
        user,
        reward: false,
        message,
      });
      return message.reply({ embeds: [embed] });
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      return message.reply(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``);
    }
  },
};
