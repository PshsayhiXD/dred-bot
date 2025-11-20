export default {
  name: "mango67",
  description: "boii ts so tuff😂✌✌.",
  aliases: [],
  usage: "<bet>",
  category: "gambling",
  perm: 0,
  cooldown: 15,
  globalCooldown: 0,
  id: 67,
  dependencies: `commandEmbed formatAmount scheduleDelete
                 parseBet config randomNumber getDredcoin 
                 addDredcoin saveData removeDredcoin 
                 loadData gambleStreak getGambleStreak`,
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
    if (data.mango67) {
      setTimeout(async () => {
        data = await dep.loadData(user);
        data.mango67 = false;
        if (data.mango === false) await dep.saveData(user, data);
      });
      return message.react("⚠");
    }
    await dep.removeDredcoin(user, bet);
    const outcomes = [
      { m: 0, text: "🤢 Your mango rotted away.." },
      { m: 0.5, text: "🥭 A small mango grew." },
      { m: 1.25, text: "🥭 A ripe mango! Delicious." },
      { m: 2, text: "✨ A golden mango shines!" },
      { m: 2.75, text: "🌌 DIVINE mango!!" },
    ];
    const weights = [0.4, 0.3, 0.2, 0.08, 0.02];
    const roll = async () => {
      let r = await dep.randomNumber();
      let sum = 0;
      for (let i = 0; i < outcomes.length; i++) {
        sum += weights[i];
        if (r <= sum) return outcomes[i];
      }
      return outcomes[0];
    };
    const o = await roll();
    let amt = Math.floor(bet * o.m);
    let newBalance = (await dep.loadData(user)).balance.dredcoin;
    if (amt > 0) {
      const r = await dep.addDredcoin(user, amt);
      newBalance = r.newBalance;
    }
    await dep.gambleStreak(user, amt > 0);
    const streak = await dep.getGambleStreak(user);
    const msgEmbed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} ${bet}`,
      description: "🌱 Planting your mango seed...",
      color: "#2E8B57",
      user,
      reward: false,
      message,
    });
    const msg = await message.reply({ embeds: [msgEmbed] });
    const length = 10;
    let filled = 0;
    const interval = setInterval(async () => {
      if (filled <= length) {
        const bar = "█".repeat(filled) + "▒".repeat(length - filled);
        const fruit = filled < length / 3 ? "🌱" : filled < length ? "🥭" : (o.m >= 10 ? "🌌" : o.m >= 3 ? "✨" : "🥭");
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command} ${bet}`,
          description: `${fruit} |${bar}|.`,
          color: "#2E8B57",
          user,
          reward: false,
          message,
        });
        await msg.edit({ embeds: [embed] });
        filled++;
      } else {
        clearInterval(interval);
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command} ${bet}`,
          description: `**${o.text}**\n` +
                       `${o.m >= 3 ? "✨ " : ""}Growth: |${"█".repeat(length)}|.\n` +
                       `❌ Multiplier: **\`x${o.m}\`**.\n` +
                       `💸 Won: **\`${await dep.formatAmount(amt)}${dep.config.CURRENCY_SYMBOL}\`**.\n` +
                       `💰 Balance: **\`${await dep.formatAmount(newBalance)}${dep.config.CURRENCY_SYMBOL}\`**.\n` +
                       `🔥 Streak: **\`${streak}\`**.`,
          color: amt > 0 ? "#00FF00" : "#FF0000",
          user,
          reward: false,
          message,
        });
        data = await dep.loadData(user);
        data.mango67 = true;
        await dep.saveData(user, data);
        await msg.edit({ embeds: [embed] });
      }
    }, 600);
  },
};