export default {
  name: 'inventory',
  description: 'View your inventory.',
  aliases: ['inv', 'bag'],
  usage: '',
  category: 'item',
  perm: 0,
  cooldown: 5,
  globalCooldown: 0,
  id: 40,
  dependencies: `listItems commandEmbed commandButtonComponent 
                 commandSelectComponent config toRoman log thisFile`,
  execute: async (message, args, user, command, dep) => {
    try {
      const perPage = dep.config.INVENTORY_MAX_ITEM_PERPAGE || 10;
      let allItems = await dep.listItems(user, { Metadata: true });
      let totalPages = Math.max(1, Math.ceil(allItems.length / perPage));
      let currentPage = 1;
      const renderPage = async (page, interaction = null, refresh = false) => {
        if (refresh) {
          allItems = await dep.listItems(user, { Metadata: true });
          totalPages = Math.max(1, Math.ceil(allItems.length / perPage));
          if (page > totalPages) page = totalPages;
        }
        const start = (page - 1) * perPage;
        const pageItems = allItems.slice(start, start + perPage);
        const lines = await Promise.all(
          pageItems.map(async i => {
            const enchStr = await Promise.all(
              (i.enchants || []).map(async e => {
                const disp = dep.enchants?.[e.id]?.display || e.id;
                const roman = await dep.toRoman(e.level);
                return `${dep.enchants?.[e.id]?.emoji || ''} ${disp} ${roman}`;
              })
            ).then(arr => arr.join(', '));
            const name = i.meta?.name || i.id || 'Unknown';
            const prefix = enchStr ? `${enchStr} ` : '';
            return `- \`${prefix}${name}\` x**${i.count}**`;
          })
        );
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command}`,
          description: lines.length ? lines.join('\n') : '📦 **Your inventory is empty.**',
          color: '#00AAFF',
          user,
          reward: false,
          message,
        });
        const components = await dep.commandButtonComponent([
          {
            label: '⬅️',
            style: 2,
            disabled: page <= 1,
            onClick: async btn => {
              if (btn.user.id !== message.author.id) return;
              currentPage--;
              return renderPage(currentPage, btn);
            },
          },
          {
            label: `${page}/${totalPages}`,
            style: 1,
            onClick: async btn => {
              if (btn.user.id !== message.author.id) return;
              if (!pageItems.length) return btn.reply({ content: '📦 No items on this page.', ephemeral: true });
              const selectRow = await dep.commandSelectComponent({
                placeholder: '🧾 View item details',
                options: await Promise.all(
                  pageItems.map(async i => {
                    const name = i.meta?.name || i.id;
                    const enchStr = await Promise.all(
                      (i.enchants || []).map(async e => {
                        const disp = dep.enchants?.[e.id]?.display || e.id;
                        const roman = await dep.toRoman(e.level);
                        return `${disp} ${roman}`;
                      })
                    ).then(arr => arr.join(', '));
                    return {
                      label: enchStr ? `${enchStr} ${name}` : name,
                      value: i.path,
                      description: `Count: ${i.count}`,
                    };
                  })
                ),
                onSelect: async sel => {
                  const val = sel.values[0];
                  const match = pageItems.find(i => i.path === val);
                  if (!match) return sel.reply({ content: '❌ Item not found.', ephemeral: true });
                  const enchStr = await Promise.all(
                    (match.enchants || []).map(async e => {
                      const disp = dep.enchants?.[e.id]?.display || e.id;
                      const roman = await dep.toRoman(e.level);
                      return `${dep.enchants?.[e.id]?.emoji || ''} ${disp} ${roman}`;
                    })
                  ).then(arr => arr.join(', '));
                  const name = match.meta?.name || match.id || 'Unknown';
                  return sel.reply({
                    content: `📄 \`${match.path}\`\n${enchStr ? `${enchStr} ` : ''}${name} x**${match.count}**`,
                    ephemeral: true,
                  });
                },
              });
              return btn.reply({ content: '📦 **Choose an item** to view:', components: selectRow, ephemeral: true });
            },
          },
          {
            label: '➡️',
            style: 2,
            disabled: page >= totalPages,
            onClick: async btn => {
              if (btn.user.id !== message.author.id) return btn.reply({ content: '❌ Not your inventory.', ephemeral: true });
              currentPage++;
              return renderPage(currentPage, btn);
            },
          },
          {
            label: '🔄 Refresh',
            style: 3,
            onClick: async btn => {
              if (btn.user.id !== message.author.id) return btn.reply({ content: '❌ Not your inventory.', ephemeral: true });
              return renderPage(currentPage, btn, true);
            },
          },
        ]);
        if (interaction) return interaction.update({ embeds: [embed], components });
        return message.reply({ embeds: [embed], components });
      };
      return renderPage(currentPage);
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      return message.reply(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``);
    }
  },
};
