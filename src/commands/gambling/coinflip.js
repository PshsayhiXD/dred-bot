export default {
  name: "coinflip",
  description: "Flip a coin: Heads or Tails.",
  aliases: ["cf"],
  usage: `<bet> <"heads"/"tails">`,
  category: "gambling",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 65,
  dependencies: `commandEmbed formatAmount parseBet scheduleDelete
                 config randomNumber addDredcoin saveData getDredcoin
                 removeDredcoin loadData gambleStreak getGambleStreak`,
  execute: async (message, args, user, command, dep) => {
    let data = await dep.loadData(user);
    const balance = await dep.getDredcoin(user);
    const { bet, err } = await dep.parseBet(args[0], balance);
    const choice = (args[1] || "").toLowerCase();
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
    await dep.removeDredcoin(user, bet);
    const flip = await dep.randomNumber() < 0.5 ? "heads" : "tails";
    let res = "", win = false, amt = 0, newBalance = 0;
    if (flip === choice) {
      win = true;
      amt = bet * 1.5;
      const r = await dep.addDredcoin(user, amt);
      newBalance = r.newBalance;
      res = `🎉 Coin landed on **\`${flip}\`** - You win **\`${await dep.formatAmount(amt)}${dep.config.CURRENCY_SYMBOL}\`**!`;
    } else {
      newBalance = (await dep.loadData(user)).balance.dredcoin;
      res = `💔 Coin landed on **\`${flip}\`** - You lost **\`${await dep.formatAmount(bet)}${dep.config.CURRENCY_SYMBOL}\`**.`;
    }
    await dep.gambleStreak(user, win);
    const streak = await dep.getGambleStreak(user);
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} ${bet} ${choice}`,
      description: `${res}\n` +
                   `💸 Won: **\`${await dep.formatAmount(bet * 1.5)}\`**.\n` +
                   `💰 Balance: **\`${await dep.formatAmount(newBalance)}\`**.\n` +
                   `🔥 Streak: **\`${streak}\`**.`,
      color: win ? "#00FF00" : "#FF0000",
      user,
      reward: false,
      message,
    });
    await message.reply({ embeds: [embed] });
  },
};