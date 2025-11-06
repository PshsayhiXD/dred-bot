export default {
  name: "onlyup",
  description: "Climb higher and higher - cash out before you fall!",
  aliases: ["ou"],
  usage: "<bet>",
  category: "gambling",
  perm: 0,
  cooldown: 15,
  globalCooldown: 0,
  id: 66,
  dependencies: `commandEmbed commandButtonComponent formatAmount parseBet
                 config randomNumber addDredcoin saveData scheduleDelete
                 removeDredcoin loadData gambleStreak getGambleStreak getDredcoin`,
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
    if (data.onlyup) {
      setTimeout(async () => {
        data = await dep.loadData(user);
        data.onlyup = false;
        if (data.onlyup === false) await dep.saveData(user, data);
      }, 45000);
      return message.react("⚠");
    }
    const now = Date.now();
    if (now - data.onlyupHistory.lastReset > 24*60*60*1000) {
      data.onlyupHistory.count = 0;
      data.onlyupHistory.lastReset = now;
    }
    data.onlyup = true;
    data.onlyupHistory = data.onlyupHistory || {
      count: 0,
      lastReset: Date.now()
    };
    data.onlyupHistory.count++;
    await dep.saveData(user, data);
    await dep.removeDredcoin(user, bet);
    let step = 0, multiplier = 1, ended = false, baseChance = 0.15 + step * 0.075;
    const historyBonus = data.onlyupHistory.count * 0.075;
    let fallChance = Math.min(baseChance + historyBonus, 0.5);
    const scale = Math.max(0.5, 1 - data.onlyupHistory.count * 0.1); 
    const growth = 0.25 + await dep.randomNumber() * 0.5;
    const multiplierGrowth = growth * scale;
    const makeEmbed = async (end = false, win = false, amt = 0, res = "") => {
      return dep.commandEmbed({
        title: `${dep.config.PREFIX}${command} ${bet}`,
        description: end
          ? `${res}\n\n` +
            `💰 Balance: **\`${await dep.formatAmount(await (await dep.loadData(user)).balance.dredcoin)}\`**.`
          : `⬆ Step: **${step}**\n` +
            `📈 Multiplier: **x${multiplier.toFixed(2)}**\n` +
            `💰 Potential: **\`${await dep.formatAmount(Math.floor(bet * multiplier))}${dep.config.CURRENCY_SYMBOL}\`**.\n` +
            `⚠ Chance to fall: **\`${(fallChance * 100).toFixed(1)}%\`**.`,
        color: end ? (win ? "#00FF00" : "#FF0000") : "#1E90FF",
        user,
        reward: false,
        message,
      });
    };
    const embed = await makeEmbed();
    const msg = await message.reply({ embeds: [embed] });
    const rows = await dep.commandButtonComponent([
      {
        label: "Climb Higher",
        style: 1,
        customId: `${command}_climb_${user}`,
        emoji: "⬆",
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          if (ended) return;
          step++;
          multiplier += multiplierGrowth;
          baseChance = 0.15 + step * 0.075;
          fallChance = Math.min(baseChance + historyBonus, 0.5); // recalc per step
          if (await dep.randomNumber() < fallChance) { 
            ended = true;
            await dep.gambleStreak(user, false);
            const e = await makeEmbed(true, false, 0, "💥 You fell! Lost everything...");
            await i.update({ embeds: [e], components: [] });
            return;
          }
          const e = await makeEmbed();
          await i.update({ embeds: [e] });
        },
      },
      {
        label: "Cash Out",
        style: 3,
        customId: `${command}_cash_${user}`,
        emoji: "💰",
        onClick: async i => {
          if (i.user.id !== message.author.id) return;
          if (ended) return;
          ended = true;
          const amt = Math.floor(bet * multiplier);
          const r = await dep.addDredcoin(user, amt);
          await dep.gambleStreak(user, true);
          const streak = await dep.getGambleStreak(user);
          const e = await dep.commandEmbed({
            title: `${dep.config.PREFIX}${command} ${bet}`,
            description: `🎉 You cashed out at **x${multiplier.toFixed(2)}**!\n` +
                         `💰 Won: **\`${await dep.formatAmount(amt)}${dep.config.CURRENCY_SYMBOL}\`**\n` +
                         `🔥 Streak: **\`${streak}\`**\n` +
                         `💰 Balance: **\`${await dep.formatAmount(r.newBalance)}\`**`,
            color: "#00FF00",
            user,
            reward: false,
            message,
          });
          data = await dep.loadData(user);
          data.onlyup = false;
          await dep.saveData(user, data);
          await i.update({ embeds: [e], components: [] });
        },
      },
    ]);
    await msg.edit({ components: rows });
    setTimeout(async () => {
      if (!ended) {
        ended = true;
        await dep.gambleStreak(user, false);
        const e = await makeEmbed(true, false, 0, "⌛ Timed out - You fell!");
        data = await dep.loadData(user);
        data.onlyup = false;
        await dep.saveData(user, data);
        await msg.edit({ embeds: [e], components: [] });
      }
    }, 45000);
  },
};