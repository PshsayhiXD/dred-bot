import { DateTime } from 'luxon';
export default {
  name: 'timezoneinfo',
  description: 'Show time and offset for a timezone.',
  aliases: ['tz', 'tzinfo'],
  usage: '<timezone>',
  category: 'utility',
  perm: 0,
  cooldown: 1,
  globalCooldown: 10,
  id: 15,
  dependencies: `commandEmbed config`,
  execute: async (message, args, user, command, dep) => {
    const zone = args.join('_') || 'UTC';
    const time = DateTime.now().setZone(zone);
    if (!time.isValid) return message.react('❌');
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: [
        `🌍 **Timezone**: \`${zone}\``,
        `🕒 **Current Time**: \`${time.toFormat('cccc, dd LLL yyyy • HH:mm:ss')}\``,
        `🧭 **UTC Offset**: \`UTC${time.toFormat('Z')}\``,
        `📛 **Abbreviation**: \`${time.offsetNameShort}\``,
        `🌐 **Daylight Saving**: \`${time.isInDST ? 'Yes' : 'No'}\``
      ].join('\n'),
      user,
      reward: false,
      message,
    });
    message.reply({ embeds: [embed] });
  },
};