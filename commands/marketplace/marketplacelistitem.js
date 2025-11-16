export default {
  name: 'marketplacelistitem',
  description: 'List items for sale.',
  aliases: ['marketplacelist', 'marketplacesell', 'mps', 'mpls'],
  usage: '<itemPath> <price> [amount]',
  category: 'marketplace',
  perm: 0,
  cooldown: 0,
  globalCooldown: 3600,
  id: 41,
  dependencies: `listItemForSale commandEmbed config log thisFile`,
  execute: async (message, args, user, command, dep) => {
    const [itemPath, priceStr, amountStr] = args;
    const price = parseInt(priceStr, 10);
    const amount = Math.max(1, parseInt(amountStr || '1', 10));
    try {
      const results = [];
      for (let i = 0; i < amount; i++) {
        const res = await dep.listItemForSale(user, itemPath, price);
        if (typeof res === 'string') {
          if (i === 0) return message.reply(res);
          break;
        }
        results.push(res);
      }
      if (!results.length) return message.react('❌');
      const item = results[0].item;
      const name = item.name || item.id || 'Unknown';
      const currency = dep.config.CURRENCY_EMOJI || '🪙';
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: `✅ Listed **\`${results.length}x ${name}\`** for **\`${currency}${price}\`** each.\n` + `Total: **\`${currency}${price * results.length}\`**.\n` + `Listing IDs:\n` + `${results.map(r => `• \`${r.id}\``).join('\n')}`,
        color: '#00FF88',
        user,
        reward: false,
        message,
      });
      return message.reply({ embeds: [embed] });
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      return message.reply(`❌ [${dep.thisFile(import.meta.url)}]: ${err.message}`);
    }
  },
};
