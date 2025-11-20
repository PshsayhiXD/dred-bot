export default {
  name: 'anonymous',
  description: 'Play anonymously without link account.',
  aliases: ['anon', 'guest'],
  usage: '',
  category: 'account',
  perm: 0,
  cooldown: 1,
  globalCooldown: 1,
  id: 11,
  dependencies: `loadData saveData commandEmbed config`,
  execute: async (message, args, user, command, dep) => {
    if (message.deletable) message.delete().catch(() => {});
    const data = await dep.loadData(user);
    let description = '';
    if (data?.account) description = `⚠️ You're already logged in as **${user}**.`;
    else {
      const anonName = `Anon-${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;
      const pass = helper.newToken(16);
      data = {
        account: {
          id: message.author.id,
          password: pass,
          status: "anonymous",
          loggedInAt: Date.now()
        }
      };
      try { await message.member.setNickname(anonName);
      } catch {}
      await dep.saveData(user, data);
      description = `✅ You're now logged in as **\`${anonName}\`** (Guest).\n`
                     `Your temporary password:\n` +
                     `||${pass}||\n` +
                     `Use \`${dep.config.PREFIX}logout\` to exit guest mode.`;
    }
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description,
      color: '#00FF00',
      user,
      reward: false,
      message
    });
    try { await message.author.send({ embeds: [embed] });
    } catch {}
  }
};
