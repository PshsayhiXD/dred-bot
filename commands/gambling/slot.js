export default {
  name: "slot",
  description: "Spin the slot machine for Dredcoin.",
  aliases: ["slots"],
  usage: "<bet>",
  category: "gambling",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 57,
  dependencies: `commandEmbed formatAmount config parseAmount
                 addDredcoin removeDredcoin loadData parseBet getDredcoin
                 getGambleStreak gambleStreak randomNumber scheduleDelete`,
  execute: async (message, args, user, command, dep) => {
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
    const streak = await dep.getGambleStreak(user);
    await dep.removeDredcoin(user, bet);
    const emojis = ["🍒","🍋","🍊","🍇","💎","⭐","🍀"];
    const result = [
      emojis[Math.floor(await dep.randomNumber() * emojis.length)],
      emojis[Math.floor(await dep.randomNumber() * emojis.length)],
      emojis[Math.floor(await dep.randomNumber() * emojis.length)]
    ];
    const reels = ["❓","❓","❓"];
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} ${bet}`,
      description: `**🎰 Spinning...**\n[ ${reels[0]} / ${reels[1]} / ${reels[2]} ]`,
      color: "#808080",
      user,
      reward: false,
      message,
    });
    const msg = await message.reply({ embeds: [embed] });
    const reel = async (i, delay) => {
      return new Promise(resolve => {
        setTimeout(async () => {
          reels[i] = result[i];
          const embed = await dep.commandEmbed({
            title: `${dep.config.PREFIX}${command} ${bet}`,
            description: `**🎰 Spinning...**\n` + 
                         `[ ${reels[0]} / ${reels[1]} / ${reels[2]} ]`,
            color: "#808080",
            user,
            reward: false,
            message,
          });
          await msg.edit({ embeds: [embed] });
          resolve();
        }, delay);
      });
    };
    await reel(0, 800);
    await reel(1, 800);
    await reel(2, 800);
    const [a,b,c] = result;
    let outcome = { multiplier: 0, status: "", color: "#FF0000" };
    if (a === b && b === c) {
      outcome.multiplier = 3.5;
      outcome.status = `**JACKPOT**! You won **\`${await dep.formatAmount(bet*3.5)}${dep.config.CURRENCY_SYMBOL}\`**!`;
      outcome.color = "#FFD700";
      await dep.gambleStreak(user, streak + 1);
    } else if (a === b || b === c || a === c) {
      outcome.multiplier = 2;
      outcome.status = `Nice **Two match**! You won **\`${await dep.formatAmount(bet*2)}${dep.config.CURRENCY_SYMBOL}\`**!`;
      outcome.color = "#00FF00";
      await dep.gambleStreak(user, streak + 1);
    } else {
      outcome.status = `**No match**! You lost **\`${await dep.formatAmount(bet)}${dep.config.CURRENCY_SYMBOL}\`**.`;
      outcome.color = "#FF0000";
      await dep.gambleStreak(user, 0);
    }
    const change = Math.floor(bet * outcome.multiplier);
    let newBalance = null;
    if (change > 0) {
      const r = await dep.addDredcoin(user, change);
      newBalance = r.newBalance;
    } else {
      const r = await dep.removeDredcoin(user, bet);
      newBalance = r.newBalance;
    }
    const finalEmbed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} ${bet}`,
      description: `[ ${result[0]} / ${result[1]} / ${result[2]} ].\n` +
                   `${outcome.status}.\n` +
                   `💰 Balance: **\`${await dep.formatAmount(newBalance)}\`**.\n` +
                   `🔥 Streak: **\`${await dep.getGambleStreak(user)}\`**.`,
      color: outcome.color,
      user,
      reward: false,
      message,
    });
    await msg.edit({ embeds: [finalEmbed] });
  },
};