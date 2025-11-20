export default {
  name: 'completeresearch',
  description: 'Check and complete your finished researches.',
  usage: '',
  aliases: [],
  category: 'research',
  perm: 0,
  cooldown: 5,
  globalCooldown: 0,
  id: 49,
  dependencies: `completeResearchQueuesIfCan 
                 commandEmbed config log commandButtonComponent runCommand`,
  execute: async (message, args, user, command, dep) => {
    const run = async (interaction = null) => {
      const result = await dep.completeResearchQueuesIfCan(user, message);
      if (!result.hasChanges) {
        if (interaction) return interaction.update({ content: '0️⃣', embeds: [], components: [] });
        return message.react('0️⃣');
      }
      const desc = result.completedItems.map(r => `✅ **\`${r.id}\`** completed.`).join('\n');
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command}`,
        description: desc,
        color: '#88cc88',
        user,
        reward: false,
        message,
      });
      const buttons = await dep.commandButtonComponent([
        {
          label: 'Refresh',
          customId: `${command}_refresh_${user}`,
          style: 1,
          emoji: '🔄',
          onClick: async btn => {
            if (btn.user.id !== message.author.id) return;
            return run(btn);
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
          label: 'Research',
          customId: `${command}_research_${user}`,
          style: 2,
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
      ]);
      if (interaction) return interaction.update({ embeds: [embed], components: buttons, content: '' });
      return message.reply({ embeds: [embed], components: buttons });
    };
    return run();
  },
};
