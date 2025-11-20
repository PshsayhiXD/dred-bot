export default {
  name: 'useitem',
  description: 'Use an item in inventory.',
  aliases: ['consume', 'use'],
  usage: '<item_path> [count]',
  category: 'item',
  perm: 0,
  cooldown: 10,
  globalCooldown: 1,
  id: 16,
  dependencies: `log hasItem useItem config formatAmount thisFile
                 commandEmbed commandButtonComponent runCommand`,
  execute: async (message, args, user, command, dep) => {
    const countArg = await dep.formatAmount(args[args.length - 1]);
    const count = !isNaN(countArg) ? Math.max(1, countArg) : 1;
    const itemArg = !isNaN(countArg) ? args.slice(0, -1).join('.').toLowerCase() : args.join('.').toLowerCase();
    const useItem = async (interaction = null) => {
      const has = await dep.hasItem(user, itemArg, count);
      if (!has) {
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command}`,
          description: `❌ **You don't have \`${count}x ${itemArg}\` to use.**`,
          color: '#FF0000',
          user,
          reward: false,
          message,
        });
        if (interaction) return interaction.update({ embeds: [embed], components: [] });
        return message.reply({ embeds: [embed] });
      }
      try {
        const result = await dep.useItem(user, itemArg, count, { removeIfEmpty: true, returnValue: true }, message);
        if (result) {
          const buttons = await dep.commandButtonComponent([
            {
              label: 'Use Again',
              style: 1,
              customId: `${command}_useagain_${user}`,
              emoji: '🔁',
              onClick: async btn => {
                if (btn.user.id !== message.author.id) return;
                return useItem(btn);
              },
            },
            {
              label: 'inventory',
              customId: `${command}_inventory_${user}`,
              style: 3,
              emoji: '🎒',
              onClick: async btn => {
                if (btn.user.id !== message.author.id) return;
                const label = btn.component.label.toLowerCase().replace(/\s+/g, '');
                await dep.runCommand(message.client, message, `${dep.config.PREFIX}${label}`);
              },
            },
            {
              label: 'Use Another Item',
              customId: `${command}_useanotheritem_${user}`,
              style: 2,
              emoji: '✨',
              onClick: async btn => {
                if (btn.user.id !== message.author.id) return;
                const modal = await dep.commandModal({
                  title: 'Use Another Item',
                  customId: `${command}_modal_${user}`,
                  inputs: [
                    {
                      customId: `${command}_useanother_item_${user}`,
                      label: 'Item Path',
                      style: 1,
                      placeholder: 'Enter item path.',
                      required: true,
                    },
                    {
                      customId: `${command}_useanother_count_${user}`,
                      label: 'Count',
                      style: 1,
                      placeholder: 'Enter count (default: 1)',
                      required: false,
                    },
                  ],
                  onSubmit: async modalSubmit => {
                    const itemArg = modalSubmit.fields.getTextInputValue(`${command}_useanother_item_${user}`).toLowerCase();
                    const countArg = parseInt(modalSubmit.fields.getTextInputValue(`${command}_useanother_count_${user}`) || '1', 10);
                    const count = isNaN(countArg) ? 1 : Math.max(1, countArg);
                    args = [itemArg, count];
                    return useItem(modalSubmit);
                  },
                });
                return btn.showModal(modal);
              },
            },
          ]);
          if (interaction) return interaction.update({ embeds: [result], components: buttons });
          return message.reply({ embeds: [result], components: buttons });
        } else {
          if (interaction) return interaction.update({ content: '✅ Used item.', components: [] });
          return message.react('✅');
        }
      } catch (err) {
        dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
        return message.reply(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``);
      }
    };
    return useItem();
  },
};
