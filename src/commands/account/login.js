export default {
  name: 'login',
  description: 'Login into your Drednot account.',
  aliases: ['loggin', 'signin'],
  usage: '<account> <token>',
  category: 'account',
  perm: 0,
  cooldown: 1,
  globalCooldown: 1,
  id: 9,
  dependencies: `loadData commandEmbed newToken 
                 config saveData `,
  execute: async (message, args, user, command, dep) => {
    if (message.deletable) message.delete().catch(() => {});
    const name = args[0];
    const token = args[1];
    const data = await dep.loadData(name);
    let description = '';
    if (data?.account) description = `⚠️ You're already logged in as **${data.account.name}**.`;
    else if (!data[name]?.account) description = `❌ No account found for **${name}**.`;
    else if (token !== data[name].account.token) {
      data[name].account.invalidAttempts = (data[name].account.invalidAttempts || 0) + 1;
      if (data[name].account.invalidAttempts % 3 === 0) {
        const newToken = dep.newToken(16);
        data[name].account.token = newToken;
        await message.author.send({
          embeds: [await dep.commandEmbed({
            title: `${dep.config.PREFIX}${command}`,
            description: `❌ Invalid token. Token has been refreshed.`,
            color: '#FF0000',
            user,
            reward: false,
            message,
          })]
        });
      }
      await dep.saveData(user, data);
      description = `❌ Invalid token. Attempt #${data[name].account.invalidAttempts}.`;
    } else {
      const pass = dep.newToken(16);
      data = {
        account: {
          id: message.author.id,
          token,
          password: pass,
          status: "Logged-in",
          loggedInAt: Date.now(),
        }
      };
      delete data[name].account.invalidAttempts;
      await dep.saveData(user, data);
      description = `✅ Successfully logged in as **${name}**.\n` + 
                    `Your password:\n` + 
                    `||${dashboardPassword}||`;
      reward = false;
      try { await message.member.setNickname(name);
      } catch {}
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
