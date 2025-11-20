export default {
  name: 'hilo',
  description: 'Play Hi-Lo. Guess if the next card is higher or lower!',
  aliases: ['hl'],
  usage: '<bet>',
  category: 'gambling',
  perm: 0,
  cooldown: 15,
  globalCooldown: 0,
  id: 64,
  dependencies: `commandEmbed commandButtonComponent formatAmount parseBet getDredcoin
                 config parseAmount randomNumber addDredcoin saveData scheduleDelete
                 removeDredcoin loadData gambleStreak getGambleStreak`,
  execute: async (message, args, user, command, dep) => {
    let data = await dep.loadData(user);
    const balance = await dep.getDredcoin(user);
    const { bet, err } = await dep.parseBet(args[0], balance);
    if (err || bet <= 0) {
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command} ${args[0] || ""}`,
        description: `${err || "❔"}\n` + 
                     `💰 Balance: **\`${await dep.formatAmount(balance)}${dep.config.CURRENCY_SYMBOL}\`**.`,
        color: "#FF0000",
        user,
        reward: false,
        message,
      });
      const reply = await message.reply({ embeds: [embed] });
      return await dep.scheduleDelete(reply.client, reply.channel.id, reply.id);
    }
    if (data.hilo) {
      setTimeout(async () => {
        data = await dep.loadData(user);
        data.hilo = false;
        if (data.hilo === false)await dep.saveData(user, data);
      }, 30000);
      return message.react('⚠️');
    }
    data.hilo = true;
    await dep.saveData(user, data);
    await dep.removeDredcoin(user, bet);
    const suits = ['♠', '♥', '♦', '♣'];
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
    const valueRank = v => (typeof v === 'number' ? v : { J: 11, Q: 12, K: 13, A: 14 }[v]);
    const deck = [];
    for (const s of suits) for (const v of values) deck.push({ s, v });
    const draw = async () => deck.splice(Math.floor(await dep.randomNumber() * deck.length), 1)[0];
    let current = await draw();
    let pot = bet;
    let playing = true;
    const makeEmbed = async (end = false, res = null, newBalance = 0, streak = 0) => {
      return dep.commandEmbed({
        title: `${dep.config.PREFIX}${command} ${bet}`,
        description: end ? `${res}\n` + 
                           `💰 Balance: **\`${await dep.formatAmount(newBalance)}\`**.\n` + 
                           `🔥 Streak: **\`${streak}\`**.` 
                         : `🃏 Current card: **${current.v}${current.s}**.\n` + 
                           `💰 Pot: **\`${await dep.formatAmount(pot)}\`**.`,
        color: end ? '#00FF00' : '#1E90FF',
        user,
        reward: false,
        message,
      });
    };
    const msg = await message.reply({ embeds: [await makeEmbed()] });
    const finish = async (won = false, cashed = false) => {
      let res = '';
      let newBalance = balance;
      if (won || cashed) {
        const r = await dep.addDredcoin(user, pot);
        newBalance = r.newBalance;
        res = cashed ? `🏆 You cashed out **\`${await dep.formatAmount(pot)}\`**!` : `❌ You lost, but cashed last at **\`${await dep.formatAmount(pot)}\`**.`;
      } else {
        res = '💥 Wrong guess! You lost everything.';
        newBalance = (await dep.loadData(user)).balance.dredcoin;
      }
      await dep.gambleStreak(user, won || cashed);
      const streak = await dep.getGambleStreak(user);
      const e = await makeEmbed(true, res, newBalance, streak);
      await msg.edit({ embeds: [e], components: [] });
      data = await dep.loadData(user);
      data.hilo = false;
      await dep.saveData(user, data);
      playing = false;
    };
    const rows = async () =>
      dep.commandButtonComponent([
        {
          label: 'Higher',
          style: 1,
          customId: `${command}_higher_${user}`,
          emoji: '⬆️',
          onClick: async i => {
            if (i.user.id !== message.author.id) return;
            const next = await draw();
            const cVal = valueRank(current.v), nVal = valueRank(next.v);
            if (nVal > cVal) {
              pot *= 1.25;
              current = next;
              const e = await makeEmbed();
              await i.update({ embeds: [e] });
            } else {
              current = next;
              await finish(false);
            }
          },
        },
        {
          label: 'Lower',
          style: 1,
          customId: `${command}_lower_${user}`,
          emoji: '⬇️',
          onClick: async i => {
            if (i.user.id !== message.author.id) return;
            const next = await draw();
            const cVal = valueRank(current.v), nVal = valueRank(next.v);
            if (nVal < cVal) {
              pot *= 1.25;
              current = next;
              const e = await makeEmbed();
              await i.update({ embeds: [e] });
            } else {
              current = next;
              await finish(false);
            }
          },
        },
        {
          label: 'Cash Out',
          style: 3,
          customId: `${command}_cash_${user}`,
          emoji: '💰',
          onClick: async i => {
            if (i.user.id !== message.author.id) return;
            finish(true, true);
          },
        },
      ]);
    await msg.edit({ components: await rows() });
    setTimeout(() => {
      if (playing) finish(false);
    }, 30000);
  },
};