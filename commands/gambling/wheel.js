export default {
  name: "wheel",
  description: "Spin the prize wheel for Dredcoin.",
  aliases: [],
  usage: "<bet>",
  category: "gambling",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 58,
  dependencies: `commandEmbed formatAmount config addDredcoin randomNumber parseBet
                 removeDredcoin loadData parseAmount gambleStreak getGambleStreak scheduleDelete`,
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
    const streak = await dep.getGambleStreak(user);
    await dep.removeDredcoin(user, bet);
    const prizes = [
      { name: "Blue", emoji: "🟦", count: 3, multiplier: 1.5 },
      { name: "Red", emoji: "🟥", count: 2, multiplier: 3 },
      { name: "Orange", emoji: "🟧", count: 2, multiplier: 2.5 },
      { name: "Yellow", emoji: "🟨", count: 7, multiplier: 1 },
      { name: "Purple", emoji: "🟪", count: 1, multiplier: 5 },
      { name: "White", emoji: "⬜", count: 1, multiplier: 3.15 },
    ];
    const path = [
      [1,2],[1,3],[1,4],
      [2,1],[2,5],
      [3,0],[3,6],
      [4,0],[4,6],
      [5,0],[5,6],
      [6,1],[6,5],
      [7,4],[7,3],[7,2],
    ];
    const rows = 8, cols = 8;
    const shuffle = async (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(await dep.randomNumber() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    let prizeList = [];
    for (const p of prizes) {
      for (let i = 0; i < p.count; i++) prizeList.push(p);
    }
    await shuffle(prizeList);
    const buildGrid = (list) => {
      const grid = Array.from({ length: rows }, () => Array(cols).fill("⬛"));
      grid[0][3] = "🔻";
      list.forEach((p, i) => {
        const [r, c] = path[i];
        grid[r][c] = p.emoji;
      });
      return grid.map(r => r.join("")).join("\n");
    };
    const targetPrize = prizeList[Math.floor(await dep.randomNumber() * prizeList.length)];
    const targetIndex = prizeList.findIndex(p => p.name === targetPrize.name);
    const stopOffset = (targetIndex - 1 + path.length) % path.length;
    const totalSteps = stopOffset + Math.floor(await dep.randomNumber() * 8) + 3;
    let currentStep = 0;
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} ${bet}`,
      description: "**🎰 Spinning the wheel...**",
      color: "#FFD700",
      user,
      reward: false,
      message,
    });
    const msg = await message.reply({ embeds: [embed] });
    const animate = async () => {
      if (currentStep < totalSteps) {
        const offset = currentStep % path.length;
        const rotatedList = [
          ...prizeList.slice(offset),
          ...prizeList.slice(0, offset)
        ];
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command} ${bet}`,
          description: buildGrid(rotatedList),
          color: "#FFD700",
          user,
          reward: false,
          message,
        });
        await msg.edit({ embeds: [embed] });
        currentStep++;
        setTimeout(animate, 50 + currentStep * 3);
      } else {
        const offset = currentStep % path.length;
        const finalList = [
          ...prizeList.slice(offset),
          ...prizeList.slice(0, offset)
        ];
        const landedPrize = finalList[1] ?? { name: "Nothing", multiplier: 0 };
        const winAmount = Math.floor(bet * landedPrize.multiplier);
        let newBalance = null;
        if (landedPrize.multiplier > 0) {
          const result = await dep.addDredcoin(user, winAmount);
          await dep.gambleStreak(user, streak + 1);
          newBalance = result.newBalance;
        } else {
          const result = await dep.removeDredcoin(user, bet);
          await dep.gambleStreak(user, 0);
          newBalance = result.newBalance;
        }
        const finalStreak = await dep.getGambleStreak(user);
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command} ${bet}`,
          description: `${buildGrid(finalList)}\n` +
                       `🎉 You landed on **\`${landedPrize.name} (${landedPrize.multiplier}x)\`** and won **\`${await dep.formatAmount(winAmount)}${dep.config.CURRENCY_SYMBOL}\`**!\n` +
                       `💰 Current balance: **\`${await dep.formatAmount(newBalance)}\`**.\n` +
                       `🔥 Streak: **\`${finalStreak}\`**.`,
          color: "#FFD700",
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