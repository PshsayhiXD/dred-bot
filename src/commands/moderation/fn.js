import { ButtonStyle } from 'discord.js';
import path from 'path';

export default {
  name: 'fn',
  description: 'Run a function.',
  aliases: [],
  usage: '<func> [args...]',
  category: 'moderation',
  perm: 4,
  cooldown: 1,
  globalCooldown: 1,
  id: 18,
  dependencies: 'helper commandEmbed config commandButtonComponent',
  execute: async (message, args, user, command, dep) => {
    const [funcName, ...funcArgs] = args;
    const fn = dep.helper[funcName];
    if (typeof fn !== 'function') return message.reply(`❌ Function \`${funcName}\` not found.`);
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
        title: `${dep.config.PREFIX}${command} ${args.join(' ')}`,
        description,
        color: '#00FF00',
        image: hasFile ? `attachment://${path.basename(filePath)}` : null,
        user,
        reward: false,
        message
      });
      const response = { embeds: [embed] };
      if (hasFile) {
        response.files = [{
          attachment: filePath,
          name: path.basename(filePath)
        }];
      }
      return response;
    };
    const response = await runFunction();
    return message.reply({ ...response });
  }
};