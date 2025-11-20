export default {
  name: 'research',
  description: 'Start a research node.',
  usage: '<researchId>',
  aliases: [],
  category: 'research',
  perm: 0,
  cooldown: 5,
  globalCooldown: 0,
  id: 48,
  dependencies: `research commandEmbed config thisFile 
                 log commandButtonComponent runCommand`,
  execute: async (message, args, user, command, dep) => {
    const id = args[0];
    const run = async (interaction = null) => {
      try {
        const result = await dep.research(user, id);
        if (typeof result === 'string') {
          if (interaction) return interaction.update({ content: result, embeds: [], components: [] });
          return message.reply(result);
        }
        const { cost, queued } = result;
        const title = queued ? '⏳ **Research Queued**' : '✅ **Research Complete**';
        const desc = queued ? `Research \`${id}\` has **been started**.\nCost: **\`${cost}${dep.config.CURRENCY_SYMBOL}\`**.` : `Research \`${id}\` **completed instantly**.\nCost: **\`${cost}${dep.config.CURRENCY_SYMBOL}\`**.`;
        const embed = await dep.commandEmbed({
          title,
          description: desc,
          color: '#33AAFF',
          user,
          reward: false,
          message,
        });
        const buttons = await dep.commandButtonComponent([
          {
            label: 'Research',
            customId: `${command}_research_${user}`,
            style: 1,
            emoji: '🧪',
            onClick: async btn => {
              if (btn.user.id !== message.author.id) return;
              const label = btn.component.label.toLowerCase().replace(/\s+/g, '');
              const modal = await dep.commandModal({
                title: 'Research',
                customId: `${command}_research_modal_${user}`,
                inputs: [
                  {
                    label: 'Research ID',
                    customId: `${command}_research_id_${user}`,
                    style: 1,
                    placeholder: 'Enter the research ID,',
                    required: true,
                  },
                ],
                onSubmit: async modalSubmit => {
                  const researchId = modalSubmit.fields.getTextInputValue(`${command}_research_id_${user}`).toLowerCase();
                  await dep.runCommand(message.client, message, `${dep.config.PREFIX}${label} ${researchId}`);
                },
              });
              return btn.showModal(modal);
            },
          },
          {
            label: 'Research Tree',
            customId: `${command}_tree_${user}`,
            style: 3,
            emoji: '🌳',
            onClick: async btn => {
              if (btn.user.id !== message.author.id) return;
              const label = btn.component.label.toLowerCase().replace(/\s+/g, '');
              await dep.runCommand(message.client, message, `${dep.config.PREFIX}${label}`);
            },
          },
          {
            label: 'Complete Research',
            customId: `${command}_complete_${user}`,
            style: 3,
            emoji: '✅',
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
        if (interaction) return interaction.update({ content: `❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``, embeds: [], components: [] });
        return message.reply(`❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\``);
      }
    };
    if (!id) return message.react(`❔`);
    return run();
  },
};
