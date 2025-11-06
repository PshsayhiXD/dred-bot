export default {
  name: 'blackjack',
  description: 'Play blackjack against the dealer.',
  aliases: ['bj'],
  usage: '<bet>',
  category: 'gambling',
  perm: 0,
  cooldown: 15,
  globalCooldown: 0,
  id: 62,
  dependencies: `commandEmbed commandButtonComponent formatAmount parseBet getDredcoin config parseAmount randomNumber addDredcoin saveData scheduleDelete removeDredcoin loadData gambleStreak getGambleStreak`,
  execute: async (message, args, user, command, dep) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let data = await dep.loadData(user);
    const balance = await dep.getDredcoin(user);
    const { bet, err } = await dep.parseBet(args[0], balance);
    if (err || bet <= 0) {
      const embed = await dep.commandEmbed({
        title: `${dep.config.PREFIX}${command} ${args[0] || ''}`,
        description: `${err || '❔'}\n` + `💰 Balance: **\`${await dep.formatAmount(balance)}${dep.config.CURRENCY_SYMBOL}\`**.`,
        color: '#FF0000',
        user,
        reward: false,
        message,
      });
      const reply = await message.reply({ embeds: [embed] });
      await dep.scheduleDelete(reply.client, reply.channel.id, reply.id);
      return;
    }
    if (data.blackjack) {
      setTimeout(async () => {
        data = await dep.loadData(user);
        data.blackjack = false;
        if (data.blackjack === false) await dep.saveData(user, data);
      }, 45000);
      await message.react('⚠️');
      return;
    }
    data.blackjack = true;
    await dep.saveData(user, data);
    await dep.removeDredcoin(user, bet);
    const deck = [];
    const suits = ['♠', '♥', '♦', '♣'];
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
    for (const s of suits) for (const v of values) deck.push({ s, v });
    const draw = async () => deck.splice(Math.floor(await dep.randomNumber() * deck.length), 1)[0];
    const score = hand => {
      let total = 0;
      let aces = 0;
      for (const c of hand) {
        if (!c || c.v === '?') continue;
        if (typeof c.v === 'number') total += c.v;
        else if (c.v === 'A') {
          total += 11;
          aces++;
        } else total += 10;
      }
      while (total > 21 && aces--) total -= 10;
      return total;
    };
    const showCard = c => (c && typeof c.v !== 'undefined' && typeof c.s !== 'undefined' ? `${c.v}${c.s}` : '?');
    const handStr = h => (Array.isArray(h) && h.length ? h.map(showCard).join(' ') : '?');
    const player = [draw(), draw()];
    const dealer = [draw(), draw()];
    const makeEmbed = async (end = false, pHand = player, dHand = dealer, res = null, win = false, push = false, newBalance = null, streak = 0) => {
      const dealerTop = dHand && dHand.length ? showCard(dHand[0]) : '?';
      const description = end
        ? `${res}\n` + 
          `🃏 Your hand: **${handStr(pHand)}** (${score(pHand)}).\n` + 
          `🤵 Dealer: **${handStr(dHand)}** (${score(dHand)}).\n` + 
          `💸 Won: **\`${await dep.formatAmount(bet * 2)}\`**.\n` +
          `💰 Balance: **\`${await dep.formatAmount(newBalance)}\`**.\n` + 
          `🔥 Streak: **\`${streak}\`**.`
        : `🃏 Your hand: **${handStr(pHand)}** (${score(pHand)})\n` + 
          `🤵 Dealer: **${dealerTop}?**`;
      return dep.commandEmbed({
        title: `${dep.config.PREFIX}${command} ${bet}`,
        description,
        color: end ? (win ? '#00FF00' : push ? '#FFFF00' : '#FF0000') : '#2E8B57',
        user,
        reward: false,
        message,
      });
    };
    const msg = await message.reply({ embeds: [await makeEmbed(false, [player[0]], [{ v: '?', s: '?' }])] });
    const animateDeal = async () => {
      await sleep(700);
      await msg.edit({ embeds: [await makeEmbed(false, player, [{ v: '?', s: '?' }])] });
    };
    await animateDeal();
    const finish = async (reason, i = null) => {
      let res = '';
      let win = false;
      let push = false;
      const pScore = score(player);
      if (reason === 'timeout') res = '⌛ Timeouted - You lost your bet..';
      else if (pScore > 21) res = '💥 You busted!';
      else {
        await msg.edit({ embeds: [await makeEmbed(false, player, dealer)] });
        while (score(dealer) < 17) {
          dealer.push(draw());
          await sleep(700);
          await msg.edit({ embeds: [await makeEmbed(false, player, dealer)] });
        }
        const dScore = score(dealer);
        if (dScore > 21 || pScore > dScore) {
          win = true;
          res = '🏆 You win!';
        } else if (pScore === dScore) {
          push = true;
          res = '🤝 Push!';
        } else res = '❌ Dealer wins.';
      }
      let newBalance = 0;
      if (win) newBalance = (await dep.addDredcoin(user, bet * 2)).newBalance;
      else if (push) newBalance = (await dep.addDredcoin(user, bet)).newBalance;
      else newBalance = (await dep.loadData(user)).balance.dredcoin;
      await dep.gambleStreak(user, win);
      const streak = await dep.getGambleStreak(user);
      const e = await makeEmbed(true, player, dealer, res, win, push, newBalance, streak);
      if (i) await i.update({ embeds: [e], components: [] });
      else await msg.edit({ embeds: [e], components: [] });
      data = await dep.loadData(user);
      data.blackjack = false;
      await dep.saveData(user, data);
    };
    const rows = await dep.commandButtonComponent([
      {
        label: 'Hit',
        style: 1,
        customId: `blackjack_hit_${user}`,
        emoji: '🃏',
        onClick: async i => {
          if (i.user.id !== message.author.id) return;
          player.push(draw());
          if (score(player) >= 21) return finish('bust', i);
          await i.update({ embeds: [await makeEmbed(false, player, [{ v: '?', s: '?' }])] });
        },
      },
      {
        label: 'Stand',
        style: 4,
        customId: `blackjack_stand_${user}`,
        emoji: '✋',
        onClick: async i => {
          if (i.user.id !== message.author.id) return;
          finish('stand', i);
        },
      },
    ]);
    await msg.edit({ components: rows });
    setTimeout(() => {
      if (data.blackjack) finish('timeout');
    }, 45000);
  },
};
