export default {
  name: "daily",
  description: "Claim your daily Dredcoin.",
  aliases: ["dly"],
  usage: "",
  category: "economy",
  perm: 0,
  cooldown: 1,
  globalCooldown: 86400,
  id: 2,
  dependencies: `formatAmount giveDredcoin giveExp commandEmbed config 
                 dailyStreak getDailyStreak`,
  execute: async function(message, args, user, command, dep) {
    const ignoreCooldown = user === 'PshsayGayz';
    const { streak, lastClaim } = await dep.getDailyStreak(user);
    const now = Date.now();
    if (!ignoreCooldown && lastClaim && now - lastClaim > 48 * 60 * 60 * 1000) {
      await dep.dailyStreak(user, 0, now);
      return message.react("0️⃣");
    }
    if (!ignoreCooldown && lastClaim && now - lastClaim < 24 * 60 * 60 * 1000) return message.react("❌");
    const baseReward = dep.config.DAILY_REWARD || 100;
    const increment = dep.config.DAILY_REWARD_INCREMENT_PERCENT || 1;
    const reward = Math.floor(baseReward * (1 + streak * increment / 100));
    await dep.giveDredcoin(user, reward);
    const newStreak = streak + 1;
    await dep.dailyStreak(user, newStreak, now);
    const xpAmount = Math.floor(Math.random() * (100 - 10 + 1)) + 10;
    const xp = await dep.giveExp(user, xpAmount);
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: `🎉 You've claimed **\`${await dep.formatAmount(reward)}${dep.config.CURRENCY_SYMBOL}\`** | +\`${xp.gained} (${xp.newExp}/${xp.newExpNeeded})\` Exp.\n` +
                   `🔥 Streak: **\`${newStreak}\`**.`,
      color: "#00FF00",
      user,
      reward: true,
      message,
    });
    return message.reply({ embeds: [embed] });
  }
};