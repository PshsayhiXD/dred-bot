export default {
  name: 'logout',
  description: 'Logout from your Drednot account.',
  aliases: ['signout', 'logoff'],
  usage: '',
  category: 'account',
  perm: 0,
  cooldown: 1,
  globalCooldown: 1,
  id: 10,
  dependencies: `loadData saveData commandEmbed config`,
  execute: async (message, args, user, command, dep) => {
    if (message.deletable) message.delete().catch(() => {});
    const data = await dep.loadData(user);
    let description = '';
    const account = data?.account;
    if (!account) description = `⚠️ **You are not currently logged in**.`;
    else {
      delete data.account;
      await dep.saveData(user, data);
      try {
        const originalName = message.member.user.username;
        await message.member.setNickname(originalName);
      } catch {}
      description = `✅ **You have been successfully logged out**.`;
    }
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description,
      color: '#00FF00',
      user,
      reward: false,
      message,
    });
    try { await message.author.send({ embeds: [embed] });
    } catch {}
  }
};
