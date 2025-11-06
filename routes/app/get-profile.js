import express from 'express';
export default ({ loadAllData, log, helper }) => {
  const Router = express.Router();
  Router.post('/get-profile', async (req, res) => {
    try {
      const options = req.body || {};
      const authToken = req.cookies['d_sess'];
      if (!authToken) return res.status(401).json({ success: false, message: '[401] No cookie.' });
      const users = await loadAllData();
      const matchedUser = users.find(u => u.account?.cookie === authToken);
      if (!matchedUser) return res.status(404).json({ success: false, message: '[404] Failed.' });
      const user = matchedUser.username || '';
      await helper.initUserObject(user);
      const formatAmount = async (amount) => helper.formatAmount(amount);
      const formatTime = async (time) => helper.formatTime(time);
      const inv = {};
      if (matchedUser.inventory) {
        for (const [itemKey, itemVal] of Object.entries(matchedUser.inventory)) {
          if (!itemVal || typeof itemVal !== 'object') continue;
          inv[itemKey] = {
            category: itemVal.category || "misc",
            count: itemVal.count || 0,
            name: itemVal.name || itemKey,
            description: itemVal.description || '',
            rarity: itemVal.rarity || '',
            enchanted: Array.isArray(itemVal.enchants) && itemVal.enchants.length > 0,
            enchants: itemVal.enchants || [],
            icon: itemVal.icon || '',
          };
        }
      }
      const daily = await helper.getDailyStreak(user);
      const weekly = await helper.getWeeklyStreak(user);
      const monthly = await helper.getMonthlyStreak(user);
      const yearly = await helper.getYearlyStreak(user);
      res.json({
        success: true,
        profile: {
          username: matchedUser.username,
          userId: matchedUser.account.id || null,
          banned: !!matchedUser.banned,
          balance: await formatAmount(matchedUser.balance?.dredcoin || 0),
          command_execute: await formatAmount(matchedUser.command_executed || 0),
          inventory: inv,
          dailyStreak: await formatAmount(daily.streak),
          weeklyStreak: await formatAmount(weekly.streak),
          monthlyStreak: await formatAmount(monthly.streak),
          yearlyStreak: await formatAmount(yearly.streak),
          next_streaks: {
            daily: await formatTime((await helper.calcNextStreak(daily.lastClaim, 'daily')).next),
            weekly: await formatTime((await helper.calcNextStreak(weekly.lastClaim, 'weekly')).next),
            monthly: await formatTime((await helper.calcNextStreak(monthly.lastClaim, 'monthly')).next),
            yearly: await formatTime((await helper.calcNextStreak(yearly.lastClaim, 'yearly')).next),
          },
          expire_streaks: {
            daily: await formatTime((await helper.calcNextStreak(daily.lastClaim, 'daily')).expire),
            weekly: await formatTime((await helper.calcNextStreak(weekly.lastClaim, 'weekly')).expire),
            monthly: await formatTime((await helper.calcNextStreak(monthly.lastClaim, 'monthly')).expire),
            yearly: await formatTime((await helper.calcNextStreak(yearly.lastClaim, 'yearly')).expire),
          },
          skills: matchedUser.skills || '',
        },
      });
    } catch (err) {
      log(`[-] Error in /get-profile: ${err.stack}`, 'error');
      res.status(500).json({ success: false, message: '[500] Internal server error', err: err.message });
    }
  });
  return Router;
};