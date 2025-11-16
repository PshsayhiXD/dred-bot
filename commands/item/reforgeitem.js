export default {
  name: 'reforgeitem',
  description: 'Reforge an item to reroll its quality (random 1-99).',
  aliases: ['forgeitem', 'fi'],
  usage: '<itemPath>',
  category: 'item',
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 46,
  dependencies: `reforgeItem formatItemQuality runCommand thisFile  
                 commandEmbed commandButtonComponent config log`,
  execute: async (message, args, user, command, dep) => {
    const run = async (itemPath, interaction = null) => {
      try {
        const result = await dep.reforgeItem(user, itemPath);
        if (typeof result === 'string') {
          if (interaction) return interaction.reply({ content: result, ephemeral: true });
          return message.reply(result);
        }
        const { oldQuality, newQuality } = result;
        const oldQ = dep.formatItemQuality(oldQuality, { emoji: true, tier: true });
        const newQ = dep.formatItemQuality(newQuality, { emoji: true, tier: true, bold: true });
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command}`,
          description: `📦 \`${itemPath}\`\n🔁 ${oldQ} → ${newQ}`,
          color: '#00FF00',
          user,
          reward: false,
          message,
        });
        const components = await dep.commandButtonComponent([
          {
            label: 'Reforge Again',
            customId: `${command}_useagain_${user}`,
            style: 1,
            emoji: '🔁',
            onClick: async btn => {
              if (btn.user.id !== message.author.id) return;
              return run(itemPath, btn);
            },
          },
          {
            label: 'Reforge Another Item',
            customId: `${command}_useagain_${user}`,
            style: 2,
            emoji: '✨',
            onClick: async btn => {
              if (btn.user.id !== message.author.id) return;
              return btn.reply({ content: `✏️ Type another item path with \`${dep.config.PREFIX}${command} <itemPath>\`.`, ephemeral: true });
            },
          },
          {
            label: 'inventory',
            customId: `${command}_inventory_${user}`,
            style: 3,
            emoji: '🎒',
            onClick: async interaction => {
              if (interaction.user.id !== message.author.id) return;
              const label = interaction.component.label.toLowerCase().replace(/\s+/g, '');
              await dep.runCommand(message.client, message, `${dep.config.PREFIX}${label}`);
            },
          },
        ]);
        if (interaction) return interaction.update({ embeds: [embed], components, content: '' });
        return message.reply({ embeds: [embed], components });
      } catch (err) {
        dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
        return message.reply(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``);
      }
    };
    const path = args[0];
    if (!path) return;
    return run(path);
  },
};
