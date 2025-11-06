export default {
  name: 'multibet',
  description: 'Bet and reroll for higher multipliers.',
  aliases: ['mb'],
  usage: '<bet>',
  category: 'gambling',
  perm: 0,
  cooldown: 15,
  globalCooldown: 0,
  id: 63,
  dependencies: `commandEmbed commandButtonComponent formatAmount scheduleDelete
                 config parseAmount randomNumber addDredcoin parseBet getDredcoin
                 removeDredcoin loadData saveData gambleStreak getGambleStreak`,
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
    if (data.multibet) {
      setTimeout(async () => { 
        data = await dep.loadData(user);
        data.multibet = false; 
        if (data.multibet === false) await dep.saveData(user, data); 
      }, 45000);
      return message.react('⚠️');
    }
    data.multibet = true;
    await dep.saveData(user, data);
    await dep.removeDredcoin(user, bet);
    const multipliers = [
      {m:0, w:0.25},
      {m:0.25, w:0.25},
      {m:0.5, w:0.2},
      {m:1, w:0.15},
      {m:1.5, w:0.1},
      {m:2, w:0.04},
      {m:3, w:0.009},
      {m:5, w:0.001}
    ];
    const rollMultiplier = async (last=false) => {
      const table = last ? 
        [
          {m:0, w:0.4},
          {m:0.25, w:0.3},
          {m:0.5, w:0.15},
          {m:1, w:0.1},
          {m:1.5, w:0.04},
          {m:2, w:0.01},
          {m:3, w:0.004},
          {m:5, w:0.001}
        ]
      : multipliers;
      let r = await dep.randomNumber(), acc = 0;
      for (const x of table) {
        acc += x.w;
        if (r <= acc) return x.m;
      }
      return 0;
    };
    let currentMult = await rollMultiplier();
    let rollsLeft = 2;
    const makeEmbed = async (end = false, res = null, amt = 0, newBalance = 0, streak = 0) => {
      return dep.commandEmbed({
        title: `${dep.config.PREFIX}${command} ${bet}`,
        description: end ? `${res}\n` + 
                           `💰 Balance: **\`${await dep.formatAmount(newBalance)}\`**.\n` + 
                           `🔥 Streak: **\`${streak}\`**.` 
                         : `🎲 Current multiplier: **${currentMult}x**.\n` + 
                           `➡️ Accept or Reroll? (${rollsLeft} reroll${rollsLeft === 1 ? '' : 's'} left).`,
        color: end ? (amt > bet ? '#00FF00' : amt === bet ? '#FFFF00' : '#FF0000') : '#2E8B57',
        user,
        reward: false,
        message,
      });
    };
    const embed = await makeEmbed();
    const msg = await message.reply({ embeds: [embed] });
    const rows = await dep.commandButtonComponent([
      { 
        label: 'Accept', 
        style: 3, 
        customId: `${command}_accept_${user}`, 
        emoji: '✅', 
        onClick: async i => {
          if (i.user.id !== message.author.id) return;
          finish('accept', i);
        }
      },
      {
        label: 'Reroll',
        style: 1,
        customId: `${command}_reroll_${user}`,
        emoji: '🎲',
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          if (rollsLeft <= 0) return finish('force', i);
          rollsLeft--;
          currentMult = await rollMultiplier(rollsLeft === 0);
          const e = await makeEmbed();
          await i.update({ embeds: [e] });
        },
      },
    ]);
    await msg.edit({ components: rows });
    const finish = async (reason, i = null) => {
      let amt = Math.floor(bet * currentMult);
      let newBalance = 0;
      if (amt > 0) {
        const r = await dep.addDredcoin(user, amt);
        newBalance = r.newBalance;
      } else newBalance = (await dep.loadData(user)).balance.dredcoin;
      const win = currentMult >= 2;
      await dep.gambleStreak(user, win);
      const streak = await dep.getGambleStreak(user);
      const res =
        reason === 'accept'
          ? `✅ You accepted **\`${currentMult}x\`** and got **\`${await dep.formatAmount(amt)}${dep.config.CURRENCY_SYMBOL}\`**!`
          : reason === 'force'
          ? `⚠️ No rerolls left. Forced to take **${currentMult}x** → **${await dep.formatAmount(amt)}${dep.config.CURRENCY_SYMBOL}**.`
          : `⌛ Game timed out. Final multiplier: **${currentMult}x** → **${await dep.formatAmount(amt)}${dep.config.CURRENCY_SYMBOL}**.`;
      const e = await makeEmbed(true, res, amt, newBalance, streak);
      if (i) await i.update({ embeds: [e], components: [] });
      else await msg.edit({ embeds: [e], components: [] });
      data = await dep.loadData(user);
      data.multibet = false;
      await dep.saveData(user, data);
    };
    setTimeout(() => {
      if (data.multibet) finish('timeout');
    }, 45000);
  },
};