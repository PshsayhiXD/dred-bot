export default {
  name: 'disassemble',
  description: 'Disassemble an item into materials.',
  usage: '<itemPath> [count]',
  aliases: ['dismantleitem', 'breakitem', 'recycleitem'],
  category: 'item',
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 47,
  dependencies: `disassembleItem commandEmbed formatItem 
                 config log commandButtonComponent runCommand
                 thisFile `,
  execute: async (message, args, user, command, dep) => {
    const path = args[0];
    const count = args[1] ? parseInt(args[1], 10) : 1;
    const runDisassemble = async () => {
      const result = await dep.disassembleItem(user, path, count);
      if (typeof result === 'string') return { error: result };
      const { itemPath, result: mats } = result;
      const lines = mats.length ? mats.map(mat => `+${mat.count}x ${dep.formatItem(mat.id)}`) : ['(No materials disassembled.)'];
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: `**Disassembled** \`${itemPath}\` x${count}:\n${lines.join('\n -')}`,
        color: '#9999FF',
        user,
        reward: false,
        message,
      });
      return { embed };
    };
    try {
      const first = await runDisassemble();
      if (first.error) return message.reply(first.error);
      const getButtons = async () => {
        return await dep.commandButtonComponent([
          [
            {
              label: 'Disassemble Again',
              customId: `${command}_useagain_${user}`,
              style: 1,
              emoji: '♻️',
              onClick: async btn => {
                if (btn.user.id !== message.author.id) return btn.reply({ content: '❌ Not yours.', ephemeral: true });
                const redo = await runDisassemble();
                if (redo.error) return btn.reply({ content: redo.error, ephemeral: true });
                await btn.update({ embeds: [redo.embed], components: await getButtons() });
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
          ],
        ]);
      };
      return message.reply({ embeds: [first.embed], components: await getButtons() });
    } catch (err) {
      dep.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      return message.reply(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``);
    }
  },
};
