export default {
  name: "give",
  description: "Give Dredcoin to target.",
  aliases: ["pay","transfer"],
  usage: "<target> <amount>",
  category: "economy",
  perm: 0,
  cooldown: 120,
  globalCooldown: 1,
  id: 12,
  dependencies: `commandEmbed transferDredcoin formatAmount config parseBet 
                 commandButtonComponent commandModal withdrawDredcoin depositDredcoin 
                 getDredcoin`,
  execute: async (message, args, user, command, dep) => {
    const wallet = await dep.getDredcoin(user);
    const parsed = await dep.parseBet(args[1], wallet);
    if (parsed.err || parsed.bet <= 0) return message.react("❌");
    let target = message.mentions.users.first();
    if (!target && args[0]) {
      const search = args[0].toLowerCase();
      target = message.guild.members.cache.find(m =>
        m.user.username.toLowerCase() === search ||
        m.user.tag.toLowerCase() === search
      )?.user;
    }
    if (!target) return message.react("❔");
    if (target === user) return message.react("⚠");
    if (target.bot) return message.react("⁉");
    const result = await dep.transferDredcoin(user, target, parsed.bet);
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description:
        `📩 ${user} Gave **\`${await dep.formatAmount(result.sent)}${dep.config.CURRENCY_SYMBOL}\`** to **${target}**.\n` +
        `Taxed: **\`${await dep.formatAmount(result.taxed)}${dep.config.CURRENCY_SYMBOL}\`**.\n` +
        `💰 ${user} New wallet: **\`${await dep.formatAmount(result.senderRemaining)}${dep.config.CURRENCY_SYMBOL}\`**.\n` +
        `💰 ${target} New wallet: **\`${await dep.formatAmount(result.receiverTotal)}${dep.config.CURRENCY_SYMBOL}\`**.`,
      color: "#00FF00",
      user,
      reward: false,
      message
    });
    const rows = await dep.commandButtonComponent([
      {
        label: "Deposit",
        customId: `${command}_deposit_${user}`,
        style: 1,
        emoji: "🏛",
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          const modal = await dep.commandModal({
            title: "Deposit Dredcoin",
            inputs: [{ label: "Amount", customId: `${command}_deposit_amount_${user}`, style: 1 }],
            onSubmit: async (mi) => {
              const bal = await dep.getDredcoin(user);
              const parsed = await dep.parseBet(mi.fields.getTextInputValue(`${command}_deposit_amount_${user}`), bal);
              if (parsed.err || parsed.bet <= 0) return mi.reply({ content: parsed.err, ephemeral: true });
              await dep.depositDredcoin(user, parsed.bet);
              return mi.reply({ content: `✅ Deposited **${parsed.bet}${dep.config.CURRENCY_SYMBOL}**.`, ephemeral: true });
            }
          });
          await i.showModal(modal);
        }
      },
      {
        label: "Withdraw",
        customId: `${command}_withdraw_${user}`,
        style: 2,
        emoji: "📩",
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          const modal = await dep.commandModal({
            title: "Withdraw Dredcoin",
            inputs: [{ label: "Amount", customId: `${command}_withdraw_amount_${user}`, style: 1 }],
            onSubmit: async (mi) => {
              const bank = await dep.getBankBalance(user);
              const parsed = await dep.parseBet(mi.fields.getTextInputValue(`${command}_withdraw_amount_${user}`), bank);
              if (parsed.err || parsed.bet <= 0) return mi.reply({ content: parsed.err, ephemeral: true });
              await dep.withdrawDredcoin(user, parsed.bet);
              return mi.reply({ content: `✅ Withdrew **${parsed.bet}${dep.config.CURRENCY_SYMBOL}**.`, ephemeral: true });
            }
          });
          await i.showModal(modal);
        }
      },
      {
        label: "Give To",
        customId: `${command}_giveto_${user}`,
        style: 3,
        emoji: "📤",
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          const modal = await dep.commandModal({
            title: "Give Dredcoin",
            inputs: [
              { label: "User", customId: `${command}_giveto_user_${user}`, style: 1 },
              { label: "Amount", customId: `${command}_giveto_amount_${user}`, style: 1 }
            ],
            onSubmit: async (mi) => {
              const recipient = mi.fields.getTextInputValue(`${command}_giveto_user_${user}`);
              const bal = await dep.getDredcoin(user);
              const parsed = await dep.parseBet(mi.fields.getTextInputValue(`${command}_giveto_amount_${user}`), bal);
              if (parsed.err || parsed.bet <= 0) return mi.reply({ content: parsed.err, ephemeral: true });
              await dep.transferDredcoin(user, recipient, parsed.bet);
              return mi.reply({ content: `✅ You gave **\`${parsed.bet}${dep.config.CURRENCY_SYMBOL}\`** to **\`${recipient}\`**.`, ephemeral: true });
            }
          });
          await i.showModal(modal);
        }
      }
    ]);
    return message.reply({ embeds: [embed], components: rows });
  }
};