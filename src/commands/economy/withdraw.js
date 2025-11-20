export default {
  name: "withdraw",
  description: "Withdraw Dredcoin from your bank.",
  aliases: ["wd","wdraw"],
  usage: "<amount/\"all\"/\"half\"/expression>",
  category: "economy",
  perm: 0,
  cooldown: 10,
  globalCooldown: 1,
  id: 4,
  dependencies: `loadData commandEmbed withdrawDredcoin getBankBalance getDredcoin 
                 formatAmount config parseBet depositDredcoin transferDredcoin 
                 commandButtonComponent commandModal`,
  execute: async (message, args, user, command, dep) => {
    const bank = await dep.getBankBalance(user);
    const parsed = await dep.parseBet(args[0], bank);
    if (parsed.err || parsed.bet <= 0) return message.react("❌");
    const result = await dep.withdrawDredcoin(user, parsed.bet);
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description: result.err ? `❌ **${result.err}**` :
        `✅ **Successfully withdrew \`${await dep.formatAmount(result.withdrawn)}${dep.config.CURRENCY_SYMBOL}\`** (Tax **\`${result.taxed}${dep.config.CURRENCY_SYMBOL}\`**).\n` +
        `💰 Wallet: **\`${await dep.formatAmount(result.walletNow)}${dep.config.CURRENCY_SYMBOL}\`**.\n` +
        `🏛 Bank: **\`${await dep.formatAmount(result.bankRemaining)}${dep.config.CURRENCY_SYMBOL}\`**.`,
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
            title: `Deposit Dredcoin`,
            inputs: [{ label: "Amount", customId: `${command}_deposit_amount_${user}`, style: 1 }],
            onSubmit: async (mi) => {
              const bal = await dep.getDredcoin(user);
              const parsed = await dep.parseBet(mi.fields.getTextInputValue(`${command}_deposit_amount_${user}`), bal);
              if (parsed.err || parsed.bet <= 0) return mi.reply({ content: parsed.err, ephemeral: true });
              await dep.depositDredcoin(user, parsed.bet);
              return mi.reply({ content: `Deposited **${parsed.bet}${dep.config.CURRENCY_SYMBOL}**.`, ephemeral: true });
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
            title: `${command} Dredcoin`,
            inputs: [{ label: "Amount", customId: `${command}_withdraw_amount_${user}`, style: 1 }],
            onSubmit: async (mi) => {
              const bank = await dep.getBankBalance(user);
              const parsed = await dep.parseBet(mi.fields.getTextInputValue(`${command}_withdraw_amount_${user}`), bank);
              if (parsed.err || parsed.bet <= 0) return mi.reply({ content: parsed.err, ephemeral: true });
              await dep.withdrawDredcoin(user, parsed.bet);
              return mi.reply({ content: `Withdrew **${parsed.bet}${dep.config.CURRENCY_SYMBOL}**.`, ephemeral: true });
            }
          });
          await i.showModal(modal);
        }
      },
      {
        label: "Give To",
        customId: `withdraw_giveTo_${user}`,
        style: 3,
        emoji: "📤",
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          const modal = await dep.commandModal({
            title: "Give Dredcoin",
            inputs: [
              { label: "User", customId: `${command}_giveTo_user_${user}`, style: 1 },
              { label: "Amount", customId: `${command}_giveTo_amount_${user}`, style: 1 }
            ],
            onSubmit: async (mi) => {
              const recipient = mi.fields.getTextInputValue(`${command}_giveTo_user_${user}`);
              const bal = await dep.getDredcoin(user);
              const parsed = await dep.parseBet(mi.fields.getTextInputValue(`${command}_giveTo_amount_${user}`), bal);
              if (parsed.err || parsed.bet <= 0) return mi.reply({ content: parsed.err, ephemeral: true });
              await dep.transferDredcoin(user, recipient, parsed.bet);
              return mi.reply({ content: `You gave **${parsed.bet}${dep.config.CURRENCY_SYMBOL}** to **${recipient}**.`, ephemeral: true });
            }
          });
          await i.showModal(modal);
        }
      }
    ]);
    return message.reply({ embeds: [embed], components: rows });
  }
};