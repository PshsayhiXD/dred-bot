export default {
  name: "dice",
  description: "Bet coins and guess the dice roll (1-6)!",
  aliases: ["roll"],
  usage: "<bet>",
  category: "gambling",
  perm: 0,
  cooldown: 10,
  globalCooldown: 0,
  id: 68,
  dependencies: `commandEmbed commandButtonComponent parseBet 
                 loadData saveData randomNumber getDredcoin config
                 addDredcoin removeDredcoin formatAmount scheduleDelete`,
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
    if (data.dice) {
      setTimeout(async () => {
        data = await dep.loadData(user);
        data.dice = false;
        await dep.saveData(user, data);
      }, 45000)
      return message.react("⚠");
    }
    data.dice = true;
    await dep.saveData(user, data);
    await dep.removeDredcoin(user, bet);
    let guessed = false;
    const diceRoll = Math.floor(await dep.randomNumber() * 6) + 1;
    const buttons = Array.from({ length: 6 }, (_, i) => {
      const guess = i + 1;
      return {
        label: guess.toString(),
        customId: `${command}_guess_${guess}_${user}`,
        style: 1,
        emoji: "🎲",
        onClick: async (interaction) => {
          if (interaction.user.id !== message.author.id) return;
          let embed;
          if (guess === diceRoll) {
            guessed = true;
            const win = bet * 2;
            await dep.addDredcoin(user, win);
            embed = await dep.commandEmbed({
              title: `${dep.config.PREFIX}${command} ${bet}`,
              description: `You guessed **\`${guess}\`**.\n` + 
                           `🎲 The dice rolled **\`${diceRoll}\`**.\n` +
                           `✅ Correct! You won **\`${await dep.formatAmount(win)}${dep.config.CURRENCY_SYMBOL}\`**!` +
                           `💰 balance: **\`${await dep.formatAmount(await dep.getDredcoin(user))}\`**`,
              color: "#00FF00",
              user,
              reward: true,
              message
            });
            data = await dep.loadData(user);
            data.dice = false;
            await dep.saveData(user, data);
          } else {
            guessed = true;
            embed = await dep.commandEmbed({
              title: `${dep.config.PREFIX}${command} ${bet}`,
              description: `You guessed **\`${guess}\`**\n` + 
                           `🎲 The dice rolled **\`${diceRoll}\`**\n` + 
                           `❌ Wrong! You lost **\`${await dep.formatAmount(bet)}${dep.config.CURRENCY_SYMBOL}\`**.\n` +
                           `💰 balance: **\`${await dep.formatAmount(await dep.getDredcoin(user))}\`**.`,
              color: "#FF0000",
              user,
              reward: false,
              message
            });
            data = await dep.loadData(user);
            data.dice = false;
            await dep.saveData(user, data);
          }
          await interaction.update({ embeds: [embed], components: [] });
        }
      };
    });
    const buttonRows = await dep.commandButtonComponent(buttons);
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command} ${bet}`,
      description: `🎲 Guess the dice roll (1-6) and win 2x your bet if correct!`,
      color: "#e5ff00ff",
      user,
      reward: false,
      message
    });
    await message.reply({ embeds: [embed], components: buttonRows });
    setTimeout(async () => {
      if (!guessed) {
        const embed = await dep.commandEmbed({
          title: `${dep.config.PREFIX}${command} ${bet}`,
          description: `⌛ Time out! You lost your bet.`,
          color: "#FF0000",
          user,
          reward: false,
          message
        });
        data = await dep.loadData(user);
        data.dice = false;
        await dep.saveData(user, data);
        return message.reply({ embeds: [embed] });
      }
    }, 45000);
  }
};