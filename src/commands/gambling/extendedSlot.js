export default {
  name: "extendedslot",
  description: "Spin a 6-reel slot machine for Dredcoin",
  aliases: [],
  usage: "<bet>",
  category: "gambling",
  perm: 0,
  cooldown: 15,
  globalCooldown: 0,
  id: 59,
  dependencies: `commandEmbed formatAmount config parseAmount randomNumber parseBet getDredcoin
                 addDredcoin removeDredcoin gambleStreak getGambleStreak scheduleDelete loadData`,
  execute: async (message, args, user, command, dep) => {
    const data = await dep.loadData(user);
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
    const { streak } = await dep.getGambleStreak(user);
    await dep.removeDredcoin(user, bet);
    const emojis = ["🍒","🍋","🍊","🍇","💎","⭐","🍀","7️⃣","🍉","🥭","🍎","🍏"];
    const spin = async () => emojis[Math.floor(await dep.randomNumber() * emojis.length)];
    let reels = [await spin(), await spin(), await spin(), await spin(), await spin(), await spin()];
    let outcome = { m: 0, text: "", color: "#FF0000" };
    const count = {};
    reels.forEach(e => (count[e] = (count[e] || 0) + 1));
    const maxMatch = Math.max(...Object.values(count));
    if (maxMatch === 6) {
      outcome.m = 7;
      outcome.text = `💎 **LEGENDARY JACKPOT!** All 6 match! You won **\`${await dep.formatAmount(bet * 7)}${dep.config.CURRENCY_SYMBOL}\`**!`;
      outcome.color = "#FFD700";
      await dep.gambleStreak(user, streak + 1);
    } else if (maxMatch === 5) {
      outcome.m = 6.5;
      outcome.text = `⚡ **Five of a kind**! You won **\`${await dep.formatAmount(bet * 6.5)}${dep.config.CURRENCY_SYMBOL}\`**!`;
      outcome.color = "#FFA500";
      await dep.gambleStreak(user, streak + 1);
    } else if (maxMatch === 4) {
      outcome.m = 4;
      outcome.text = `🍀 **Four match**! You won **\`${await dep.formatAmount(bet * 4)}${dep.config.CURRENCY_SYMBOL}\`**!`;
      outcome.color = "#00FF00";
      await dep.gambleStreak(user, streak + 1);
    } else if (maxMatch === 3) {
      outcome.m = 2;
      outcome.text = `⭐ **Three match**! You won **\`${await dep.formatAmount(bet * 2)}${dep.config.CURRENCY_SYMBOL}\`**!`;
      outcome.color = "#00FF88";
      await dep.gambleStreak(user, streak + 1);
    } else {
      outcome.m = 0;
      outcome.text = `💀 **No match**! You lost **\`${await dep.formatAmount(bet)}${dep.config.CURRENCY_SYMBOL}\`**.`;
      outcome.color = "#FF0000";
      await dep.gambleStreak(user, 0);
    }
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} ${bet}`,
      description: `🎰 Spinning...\n` + 
                   `[ ❔ / ❔ / ❔ / ❔ / ❔ / ❔ ]`,
      color: "#808080",
      user,
      reward: false,
      message,
    });
    const msg = await message.reply({ embeds: [embed] });
    let shown = ["❔","❔","❔","❔","❔","❔"];
    let i = 0;
    const animate = async () => {
      if (i < 6) {
        shown[i] = reels[i];
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command} ${bet}`,
          description: `[ ${shown.join(" / ")} ]\n` + 
                       `🎲 Rolling...`,
          color: "#808080",
          user,
          reward: false,
          message,
        });
        await msg.edit({ embeds: [embed] });
        i++;
        setTimeout(animate, 400);
      } else {
        const amt = Math.floor(bet * outcome.m);
        let newBalance = null;
        if (amt > 0) {
          const r = await dep.addDredcoin(user, amt);
          newBalance = r.newBalance;
        } else {
          const r = await dep.removeDredcoin(user, bet);
          newBalance = r.newBalance;
        }
        const { streak: finalStreak } = await dep.getGambleStreak(user);
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command} ${bet}`,
          description: `[ ${reels.join(" / ")} ].\n` +
                       `${outcome.text}\n` +
                       `💰 Balance: **\`${await dep.formatAmount(newBalance)}\`**\n` +
                       `🔥 Streak: **\`${finalStreak}\`**.`,
          color: outcome.color,
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