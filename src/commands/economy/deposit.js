export default {
  name: "deposit",
  description: "Deposit Dredcoin to your bank.",
  aliases: ["dep"],
  usage: "<amount/\"all\">",
  category: "economy",
  perm: 0,
  cooldown: 5,
  globalCooldown: 1,
  id: 3,
  dependencies: `loadData commandEmbed getBankBalance getDredcoin parseBet
                 depositDredcoin withdrawDredcoin config 
                 formatAmount commandButtonComponent commandModal`,
  execute: async (message, args, user, command, dep) => {
    const wallet = await dep.getDredcoin(user);
    const { bet: amount, err } = await dep.parseBet(args[0], wallet);
    if (err || amount <= 0) return message.react("❌");
    const result = await dep.depositDredcoin(user, amount);
    const embed = await dep.commandEmbed({
      title: `${dep.config.PREFIX}${command}`,
      description:
        `✅ **Successfully deposited \`${await dep.formatAmount(result.deposited)}${dep.config.CURRENCY_SYMBOL}\`** (Tax **\`${await dep.formatAmount(result.taxed)}${dep.config.CURRENCY_SYMBOL}\`**).\n` +
        `💰 **Wallet**: **\`${await dep.formatAmount(result.walletRemaining)}${dep.config.CURRENCY_SYMBOL}\`**.\n` +
        `🏛 **Bank**: **\`${await dep.formatAmount(result.bankNow)}${dep.config.CURRENCY_SYMBOL}\`.**`,
      color: "#00FF00",
      user,
      reward: false,
      message
    });
    const rows = await dep.commandButtonComponent([
      {
        label: "Deposit Again",
        customId: `${command}_depositagain_${user}`,
        style: 1,
        emoji: "🏛",
        onClick: async (i) => {
          if (i.user.id !== message.author.id) return;
          const modal = await dep.commandModal({
            title: `${command} Dredcoin`,
            customId: `${command}_modal_${user}`,
            inputs: [{ label: "Amount", customId: `${command}_amount_${user}`, style: 1 }],
            onSubmit: async (mi) => {
              const inp = mi.fields.getTextInputValue(`${command}_amount_${user}`);
              const w = await dep.getDredcoin(user);
              const { bet: amt, err } = await dep.parseBet(inp, w);
              if (err || amt <= 0) return mi.reply({ content: "❌ Invalid or insufficient funds.", ephemeral: true });
              const r = await dep.depositDredcoin(user, amt);
              return mi.reply({
                content: `✅ Deposited **\`${await dep.formatAmount(r.deposited)}${dep.config.CURRENCY_SYMBOL}\`** Wallet: **\`${await dep.formatAmount(r.walletRemaining)}\`** Bank: **\`${await dep.formatAmount(r.bankNow)}\`**.`,
                ephemeral: true
              });
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
            customId: `${command}_modal_${user}`,
            inputs: [{ label: "Amount", customId: `${command}_amount_${user}`, style: 1 }],
            onSubmit: async (mi) => {
              const inp = mi.fields.getTextInputValue(`${command}_amount_${user}`);
              const b = await dep.getBankBalance(user);
              const { bet: amt, err } = await dep.parseBet(inp, b);
              if (err || amt <= 0) return mi.reply({ content: "❌ Invalid or insufficient funds.", ephemeral: true });
              const r = await dep.withdrawDredcoin(user, amt);
              return mi.reply({
                content: `✅ Withdrew **\`${await dep.formatAmount(amt)}${dep.config.CURRENCY_SYMBOL}\`** Wallet: **\`${await dep.formatAmount(r.walletNow)}\`** Bank: **\`${await dep.formatAmount(r.bankRemaining)}\`**.`,
                ephemeral: true
              });
            }
          });
          await i.showModal(modal);
        }
      }
    ]);
    return message.reply({ embeds: [embed], components: rows });
  }
};