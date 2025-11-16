export default {
  name: 'itemcraftingstatus',
  description: 'Check your current crafting task.',
  aliases: ['cstatus', 'craftings'],
  usage: '',
  category: 'item',
  perm: 0,
  cooldown: 5,
  globalCooldown: 0,
  id: 44,
  dependencies: `getCraftingStatus commandEmbed runCommand thisFile  
                 commandButtonComponent config formatTime log`,
  execute: async (message, args, user, command, dep) => {
    const render = async (interaction = null) => {
      try {
        const status = await dep.getCraftingStatus(user);
        if (!status || !status.active) {
          if (interaction) return interaction.update({ content: '❌ No active crafting task.', embeds: [], components: [] });
          return message.react('0️⃣');
        }
        const remainSec = dep.formatTime(status.remaining);
        const finishAt = `<t:${Math.floor(status.end / 1000)}:R>`;
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command}`,
          description: `📦 Output: **\`${status.output.id}\`** **\`x${status.output.count || 1}\`**.\n` + `⏱️ Time left: **\`${remainSec}s\`** (**\`${finishAt}\`**).\n` + `🧪 Recipe: **\`${status.recipeId}\`**.`,
          color: '#00CC99',
          user,
          reward: false,
          message,
        });
        const components = await dep.commandButtonComponent([
          {
            label: 'Refresh',
            customId: `${command}_refresh_${user}`,
            style: 3,
            emoji: '🔄',
            onClick: async btn => {
              if (btn.user.id !== message.author.id) return;
              return render(btn);
            },
          },
          {
            label: 'inventory',
            customId: `${command}_inventory_${user}`,
            style: 1,
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
    return render();
  },
};
