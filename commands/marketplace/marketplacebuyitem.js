export default {
  name: 'marketplacebuyitem',
  description: 'Buy an item from the marketplace.',
  aliases: ['marketplacebuy', 'mpb'],
  usage: '<listingId>',
  category: 'marketetplace',
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 42,
  dependencies: `buyListing commandEmbed config log thisFile`,
  execute: async (message, args, user, command, dep) => {
    const [listingId] = args;
    try {
      const result = await dep.buyListing(user, listingId);
      if (typeof result === 'string') return message.reply(result);
      const { item, price, seller } = result;
      const name = item.name || item.id || 'Unknown';
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: `✅ You bought **\`${item.count || 1}x ${name}\`** for **\`${price}${dep.config.CURRENCY_SYMBOL}\`**.\n` + `📤 From: **\`${seller}\`**`,
        color: '#00DD88',
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
