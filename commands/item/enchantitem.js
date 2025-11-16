export default {
  name: 'enchantitem',
  description: 'Apply a random enchant to an item.',
  usage: '<item_path>',
  category: 'item',
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 36,
  dependencies: `enchantItem commandEmbed 
                 commandButtonComponent log 
                 runCommand thisFile`,
  execute: async (message, args, user, command, dep) => {
    let itemPath = args.join('.').toLowerCase();
    const run = async (interaction = null, newPath = null) => {
      if (newPath) itemPath = newPath;
      try {
        const result = await dep.enchantItem(user, itemPath);
        const buttonRow = await dep.commandButtonComponent([
          [
            {
              label: 'Enchant Again',
              customId: `${command}_enchantagain_${user}`,
              style: 1,
              emoji: '🔁',
              onClick: async btnInteraction => {
                if (btnInteraction.user.id !== message.author.id) return;
                await run(btnInteraction);
              },
            },
            {
              label: 'Enchant Another',
              customId: `${command}_enchantanother_${user}`,
              style: 2,
              emoji: '✨',
              onClick: async btnInteraction => {
                if (btnInteraction.user.id !== message.author.id) return;
                await btnInteraction.reply({ content: '✍️ Please type the new item path:', ephemeral: true });
                const filter = m => m.author.id === message.author.id;
                const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000 });
                const reply = collected.first();
                if (!reply) return btnInteraction.followUp({ content: '❌ No item path provided.', ephemeral: true });
                const newPath = reply.content.trim().toLowerCase();
                await run(btnInteraction, newPath);
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
          ],
        ]);
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command}`,
          description: `✅ **Item \`${itemPath}\` enchanted with \`${result.enchantId}\` Lv.${result.level}**`,
          color: '#00FF99',
          user,
          message,
        });
        if (interaction) return interaction.update({ embeds: [embed], components: buttonRow });
        return message.reply({ embeds: [embed], components: buttonRow });
      } catch (err) {
        dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
        return message.reply(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``);
      }
    };
    return run();
  },
};
