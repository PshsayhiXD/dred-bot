export default {
  name: 'purge',
  description: 'Bulk delete messages from the channel.',
  aliases: ['clear', 'delete'],
  usage: '<number>',
  category: 'moderation',
  perm: 4,
  cooldown: 1,
  globalCooldown: 1,
  id: 19,
  dependencies: 'commandEmbed config',
  execute: async (message, args, user, command, dep) => {
    const amount = Number(args[0]);
    if (!amount || isNaN(amount) || amount < 1 || amount > 100)
      return message.react('❌');
    const runPurge = async () => {
      const fetched = await message.channel.messages.fetch({ limit: amount });
      const toDelete = fetched.filter(msg => !msg.system && !msg.author.bot).first(amount);
      const deleted = await message.channel.bulkDelete(toDelete, true).catch(err => {
        throw new Error(err.message);
      });
      const embed = await dep.commandEmbed({
        title: '🗑️ Purge Completed',
        description: `✅ Deleted **${deleted.size}** message(s).`,
        color: '#00FF00',
        user,
        reward: false,
        message
      });
      return { embeds: [embed] };
    };
    const response = await runPurge();
    return message.channel.send({ ...response });
  }
};