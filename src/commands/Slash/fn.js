import { SlashCommandBuilder, ButtonStyle } from 'discord.js';
import path from 'path';

export default {
  data: new SlashCommandBuilder()
    .setName('fn')
    .setDescription('Run a func (DEV)')
    .addStringOption(option => option.setName('function').setDescription('func').setRequired(true))
    .addStringOption(option => option.setName('args').setDescription('Arguments to pass (space-separated, supports numbers, booleans)').setRequired(false))
    .setContexts(['Guild', 'BotDM', 'PrivateChannel']),
  dependencies: 'helper thisFile commandEmbed commandButtonComponent config',
  async execute(interaction, user, dep) {
    const allowed = dep.helper.Permission(user, 'get', '4>=');
    if (!allowed) return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    const funcName = interaction.options.getString('function');
    const rawArgs = interaction.options.getString('args') ?? '';
    const funcArgs = rawArgs
      .trim()
      .split(/\s+/)
      .filter(arg => arg.length > 0);
    const fn = dep.helper[funcName];
    if (typeof fn !== 'function') return interaction.reply({ content: `❌ Function \`${funcName}\` not found.`, ephemeral: true });
    const runFunction = async () => {
      const parsedArgs = funcArgs.map(arg => {
        if (!isNaN(arg)) return Number(arg);
        if (arg === 'true') return true;
        if (arg === 'false') return false;
        return arg;
      });
      const result = await fn(...parsedArgs);
      const filePath = result?.filePath;
      const hasFile = typeof filePath === 'string';
      const hasData = typeof result === 'object' && Object.keys(result).some(key => key !== 'filePath');
      let description = `✅ \`${funcName}(${parsedArgs.join(', ')})\` returned:`;
      if (hasData) {
        const filtered = { ...result };
        delete filtered.filePath;
        const output = typeof filtered === 'object' ? JSON.stringify(filtered, null, 2) : String(filtered);
        description += `\n\`\`\`js\n${output}\n\`\`\``;
      } else if (!hasFile) {
        const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        description += `\n\`\`\`js\n${output}\n\`\`\``;
      }
      const embed = await dep.commandEmbed({
        title: `/fn ${funcName} ${rawArgs}`,
        description,
        color: '#00FF00',
        image: hasFile ? `attachment://${path.basename(filePath)}` : null,
        user,
        reward: false,
        message: interaction,
      });
      const response = { embeds: [embed] };
      if (hasFile) response.files = [{ attachment: filePath, name: path.basename(filePath) }];
      return response;
    };
    try {
      await interaction.deferReply();
      const response = await runFunction();
      const buttons = await dep.commandButtonComponent([
        {
          label: '🔁 Run Again',
          style: ButtonStyle.Secondary,
          onClick: async btnInteraction => {
            if (btnInteraction.user.id !== interaction.user.id) return btnInteraction.reply({ content: '❌ This isn’t your command.', ephemeral: true });
            try {
              const newResponse = await runFunction();
              await btnInteraction.update({ ...newResponse });
            } catch (err) {
              await btnInteraction.reply({ content: `❌ Error: \`${err.message}\``, ephemeral: true });
            }
          },
        },
      ]);
      return interaction.editReply({ ...response, components: buttons });
    } catch (err) {
      dep.helper.log(`[${dep.thisFile(import.meta.url)}] ${err}`, 'error');
      return interaction.editReply({ content: `❌ [${dep.thisFile(import.meta.url)}]: \`${err.message}\`` });
    }
  },
};
