export default {
  name: 'gamble',
  description: 'Gamble your Dredcoin.',
  aliases: [],
  usage: '<bet>',
  category: 'gambling',
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 56,
  dependencies: `commandEmbed formatAmount config parseAmount randomNumber parseBet scheduleDelete
                 addDredcoin removeDredcoin loadData gambleStreak getGambleStreak getDredcoin`,
  execute: async (message, args, user, command, dep) => {
    const data = await dep.loadData(user);
    const balance = await dep.getDredcoin(user);
    const { bet, err } = await dep.parseBet(args[0], balance);
    if (err || bet <= 0) {
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command} ${args[0] || ''}`,
        description: `${err || '❔'}\n` + `💰 Balance: **\`${await dep.formatAmount(balance)}${dep.config.CURRENCY_SYMBOL}\`**.`,
        color: '#FF0000',
        user,
        reward: false,
        message,
      });
      const reply = await message.reply({ embeds: [embed] });
      return await dep.scheduleDelete(reply.client, reply.channel.id, reply.id);
    }
    await dep.removeDredcoin(user, bet);
    const outcomes = [
      { m: 5, text: async (a) => `⚡ **Jackpot!** You won **\`${await dep.formatAmount(a)}${dep.config.CURRENCY_SYMBOL}\`**!`, color: '#FFD700' },
      { m: 3, text: async (a) => `🔥 **Triple win**! You won **\`${await dep.formatAmount(a)}${dep.config.CURRENCY_SYMBOL}\`**!`, color: '#FFA500' },
      { m: 2, text: async (a) => `💰 **Double up**! You won **\`${await dep.formatAmount(a)}${dep.config.CURRENCY_SYMBOL}\`**!`, color: '#00FF00' },
      { m: 1.5, text: async (a) => `⭐ **1.5x win**! You won **\`${await dep.formatAmount(a)}${dep.config.CURRENCY_SYMBOL}\`**!`, color: '#32CD32' },
      { m: 1, text: async (a) => `**Broke even** with **\`${await dep.formatAmount(a)}${dep.config.CURRENCY_SYMBOL}\`**.`, color: '#FFFF00' },
      { m: 0.5, text: async (a) => `**Half left**! Lost **\`${await dep.formatAmount(Math.floor(bet * 0.5))}${dep.config.CURRENCY_SYMBOL}\`**.`, color: '#FF4500' },
      { m: 0.25, text: async (a) => `**Quarter left**! Lost **\`${await dep.formatAmount(Math.floor(bet * 0.75))}${dep.config.CURRENCY_SYMBOL}\`**.`, color: '#B22222' },
      { m: 0, text: async () => `**Lost everything**.. **\`${await dep.formatAmount(bet)}${dep.config.CURRENCY_SYMBOL}\`**..`, color: '#FF0000' },
    ];
    const weights = [0.001, 0.004, 0.015, 0.03, 0.15, 0.3, 0.25, 0.25];
    const r = await dep.randomNumber();
    let acc = 0,
      chosen = outcomes[outcomes.length - 1];
    for (let i = 0; i < outcomes.length; i++) {
      acc += weights[i];
      if (r < acc) {
        chosen = outcomes[i];
        break;
      }
    }
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} ${bet}`,
      description: '🎲 **Gambling...**',
      color: '#808080',
      user,
      reward: false,
      message,
    });
    const msg = await message.reply({ embeds: [embed] });
    let steps = Math.floor(await dep.randomNumber() * 6) + 5;
    let c = 0;
    const animate = async () => {
      if (c < steps) {
        const fake = outcomes[Math.floor(await dep.randomNumber() * outcomes.length)];
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command} ${bet}`,
          description: `🎲 **Rolling...**\n` + (typeof fake.text === 'function' ? (fake.m === 0 ? await fake.text() : await fake.text(Math.floor(bet * fake.m))) : ''),
          color: fake.color,
          user,
          reward: false,
          message,
        });
        await msg.edit({ embeds: [embed] });
        c++;
        setTimeout(animate, 150 + c * 20);
      } else {
        const amt = Math.floor(bet * chosen.m);
        const r = await dep.addDredcoin(user, amt);
        const newBalance = r.newBalance;
        await dep.gambleStreak(user, chosen.m >= 2);
        const streak = await dep.getGambleStreak(user);
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command} ${bet}`,
          description: `${await chosen.text(amt)}\n` + `💰 Balance: **\`${await dep.formatAmount(newBalance)}\`**.\n` + `🔥 Streak: **\`${streak}\`**.`,
          color: chosen.color,
          user,
          reward: false,
          message,
        });
        await msg.edit({ embeds: [embed] });
      }
    };
    animate();
  },
};
