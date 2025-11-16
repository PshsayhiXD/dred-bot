export default {
  name: 'useenchantscroll',
  description: 'Use an enchant scroll on an item.',
  usage: '<scroll> <item_path>',
  category: 'enchant',
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 37,
  dependencies: `useEnchantScroll hasItem removeItem 
                 commandEmbed commandButtonComponent 
                 log commandModal runCommand thisFile`,
  execute: async (message, args, user, command, dep) => {
    const [scroll, ...pathParts] = args;
    const itemPath = pathParts.join('.').toLowerCase();
    const run = async (interaction = null, overrideItem = null) => {
      try {
        const result = await dep.useEnchantScroll(user, scroll.toLowerCase(), overrideItem || itemPath);
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command}`,
          description: `✅ **Scroll \`${scroll}\` used on \`${overrideItem || itemPath}\` → \`${result.enchantId}\` Lv.${result.level}**`,
          color: '#00AAFF',
          user,
          message,
        });
        const buttons = await dep.commandButtonComponent([
          {
            label: 'Use Scroll Again',
            customId: `${command}_useagain_${user}`,
            style: 1,
            emoji: '🔁',
            onClick: async btn => {
              if (btn.user.id !== message.author.id) return;
              return run(btn, overrideItem || itemPath);
            },
          },
          {
            label: 'Use Scroll on Another Item',
            customId: `${command}_useanother_${user}`,
            style: 2,
            emoji: '✨',
            onClick: async btn => {
              if (btn.user.id !== message.author.id) return;
              const modal = await dep.commandModal({
                title: 'Select Another Item',
                customId: `${command}_modal_${user}`,
                inputs: [
                  {
                    label: 'Item Path',
                    customId: 'item_path',
                    style: 1,
                    placeholder: 'Enter the item path.',
                    required: true,
                  },
                ],
                onSubmit: async modalSubmit => {
                  const newItem = modalSubmit.fields.getTextInputValue('item_path').toLowerCase();
                  await run(modalSubmit, newItem);
                },
              });

              return btn.showModal(modal);
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
        ]);
        if (interaction) return interaction.update({ embeds: [embed], components: buttons, content: '' });
        return message.reply({ embeds: [embed], components: buttons });
      } catch (err) {
        dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
        return message.reply(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``);
      }
    };
    return run();
  },
};
