export default {
  name: "weekly",
  description: "Claim your weekly Dredcoin.",
  aliases: ["wkly"],
  usage: "",
  category: "economy",
  perm: 0,
  cooldown: 1,
  globalCooldown: 604800, 
  id: 60,
  dependencies: `formatAmount giveDredcoin giveExp commandEmbed config 
                 weeklyStreak getWeeklyStreak`,
  execute: async (message, args, user, command, dep) => {
    const { streak, lastClaim } = await dep.getWeeklyStreak(user);
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    if (lastClaim && now - lastClaim > 2 * weekMs) {
      await dep.weeklyStreak(user, 0, now);
      return message.react("0️⃣");
    }
    if (lastClaim && now - lastClaim < weekMs) return message.react("❌");
    const baseReward = dep.config.WEEKLY_REWARD || 1000;
    const increment = dep.config.WEEKLY_REWARD_INCREMENT_PERCENT || 5;
    const reward = Math.floor(baseReward * (1 + streak * increment / 100));
    await dep.giveDredcoin(user, reward);
    const newStreak = streak + 1;
    await dep.weeklyStreak(user, newStreak, now);
    const xpAmount = Math.floor(Math.random() * (300 - 50 + 1)) + 50;
    const xp = await dep.giveExp(user, xpAmount);
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: `🎉 You've claimed \`**${await dep.formatAmount(reward)}${dep.config.CURRENCY_SYMBOL}\`** | +\`${xp.gained} (${xp.newExp}/${xp.newExpNeeded})\` Exp.\n` + 
                   `🔥 Weekly Streak: \`**${newStreak}**\`.`,
      color: "#FFD700",
      user,
      reward: true,
      message,
    });
    return message.reply({ embeds: [embed] });
  }
};