export default {
  name: 'craftitem',
  description: 'Craft an item using a recipe.',
  usage: '<recipeId> [count]',
  category: 'item',
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 35,
  dependencies: `craftItem commandEmbed 
                 commandButtonComponent 
                 log runCommand thisFile`,
  execute: async (message, args, user, command, dep) => {
    const countArg = parseInt(args[args.length - 1]);
    const count = !isNaN(countArg) ? Math.max(1, countArg) : 1;
    const recipeId = !isNaN(countArg) ? args.slice(0, -1).join('.').toLowerCase() : args.join('.').toLowerCase();
    const craft = async (interaction = null) => {
      try {
        const result = await dep.craftItem(user, recipeId, count, message);
        if (result?.embed) {
          const buttonRow = await dep.commandButtonComponent([
            {
              label: 'Craft Again',
              customId: `${command}_craftagain_${user}`,
              style: 1,
              emoji: '🔁',
              onClick: async btnInteraction => {
                if (btnInteraction.user.id !== message.author.id) return;
                await craft(btnInteraction);
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
          if (interaction) return interaction.update({ embeds: [result.embed], components: buttonRow });
          return message.reply({ embeds: [result.embed], components: buttonRow });
        }
        return message.react('✅');
      } catch (err) {
        dep.log(`[${thisFile(import.meta.url)}] ${err}`, 'error');
        return message.reply(`❌ [${thisFile(import.meta.url)}]: \`${err.message}\``);
      }
    };
    return craft();
  },
};
