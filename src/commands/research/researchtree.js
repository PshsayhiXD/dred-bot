export default {
  name: "researchtree",
  description: "Draw your research tree.",
  usage: "",
  aliases: [],
  category: "research",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 50,
  dependencies: `drawResearchTree commandButtonComponent 
                 config runCommand commandModal`,
  execute: async (message, args, user, command, dep) => {
    const run = async (interaction = null) => {
      const result = await dep.drawResearchTree(user);
      const buttons = await dep.commandButtonComponent([
        {
          label: "Refresh",
          customId: `${command}_refresh_${user}`,
          style: 1,
          emoji: "🔄",
          onClick: async btn => {
            if (btn.user.id !== message.author.id) return;
            return run(btn);
          }
        },
        {
          label: "Complete Research",
          customId: `${command}_complete_${user}`,
          style: 3,
          emoji: "✅",
          onClick: async btn => {
            if (btn.user.id !== message.author.id) return;
            const label = btn.component.label.toLowerCase().replace(/\s+/g, "");
            await dep.runCommand(message.client, message, `${dep.config.PREFIX}${label}`);
          }
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
      if (interaction) return interaction.update({ files: [result.img], components: buttons, content: "" });
      return message.reply({ files: [result.img], components: buttons });
    };
    return run();
  }
};