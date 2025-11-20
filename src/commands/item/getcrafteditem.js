export default {
  name: 'claimcraft',
  description: 'Claim your completed crafted item.',
  aliases: ['claimcrafted', 'ccraft', 'cc'],
  usage: '',
  category: 'item',
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 45,
  dependencies: `claimCraft commandEmbed config 
                 log commandButtonComponent runCommand
                 thisFile`,
  execute: async (message, args, user, command, dep) => {
    const run = async (interaction = null) => {
      try {
        const result = await dep.claimCraft(user);
        if (typeof result === 'string') {
          if (interaction) return interaction.reply({ content: result, ephemeral: true });
          return message.reply(result);
        }
        const { crafted } = result;
        const name = crafted.name || crafted.id || 'Unknown';
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command}`,
          description: `✅ You received **${crafted.count || 1}x ${name}**.`,
          color: '#00FF66',
          user,
          reward: false,
          message,
        });
        const buttonRow = await dep.commandButtonComponent([
          {
            label: 'Run Again',
            customId: `${command}_runagain_${user}`,
            style: 1,
            emoji: '🔁',
            onClick: async btnInteraction => {
              if (btnInteraction.user.id !== message.author.id) return btnInteraction.reply({ content: '❌ Not yours.', ephemeral: true });
              await run(btnInteraction);
            },
          },
          {
            label: 'inventory',
            customId: `${command}_inventory_${user}`,
            style: 2,
            emoji: '🎒',
            onClick: async interaction => {
              if (interaction.user.id !== message.author.id) return;
              const label = interaction.component.label.toLowerCase().replace(/\s+/g, '');
              await dep.runCommand(message.client, message, `${dep.config.PREFIX}${label}`);
            },
          },
        ]);
        if (interaction) return interaction.update({ embeds: [embed], components: buttonRow });
        return message.reply({ embeds: [embed], components: buttonRow });
      } catch (err) {
        dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
        if (interaction) return interaction.reply({ content: `❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``, ephemeral: true });
        return message.reply(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``);
      }
    };
    return run();
  },
};
