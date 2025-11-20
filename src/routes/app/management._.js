import express from 'express';

export default ({ loadData, loadAllData, loadUsernameByAccountCookie, loadDataByAccountCookie, saveData, log, helper }) => {
  const Router = express.Router();

  const requireAdmin = async (req, res, next) => {
    try {
      const cookie = req.cookies?.d_sess;
      if (!cookie) return res.status(401).json({ error: '[401] Unauthorized' });
      const data = await loadDataByAccountCookie(cookie);
      const user = await loadUsernameByAccountCookie(cookie);
      if (!data?.account?.id) return res.status(401).json({ error: '[401] Invalid session' });
      const rank = await helper.Permission(user, 'get', 'max');
      if (!helper.isRankBetter(rank, 4)) return res.status(403).json({ error: '[403] Forbidden' });
      req.adminUser = data.account.id;
      next();
    } catch (err) {
      log(`[-] Auth error: ${err}`, 'error');
      return res.status(500).json({ error: '[500] Auth check failed.' });
    }
  };

  Router.post('/management._listUsers', requireAdmin, async (req, res) => {
    try {
      const usernames = await loadAllData();
      const users = usernames.filter(u => u.account).map(u => ({
        id: u.account.id,
        username: u.account.username || "null",
        balance: u.balance || 0,
        command_execute: u.command_execute || 0,
        avatar: u.account.avatar || null,
        banned: u.account.banned || false,
      }));
      return res.json({ users });
    } catch (err) {
      log(`[-] /management._listUsers: ${err}`, 'error');
      return res.status(500).json({ error: '[500] Failed to list users.' });
    }
  });

  Router.post('/management._ban', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: '[400] Missing userId' });
      const data = await loadData(userId);
      if (!data?.account) return res.status(404).json({ error: '[404] User not found' });
      data.account.banned = true;
      await saveData(userId, data);
      return res.json({ success: true });
    } catch (err) {
      log(`[-] /management._ban: ${err}`, 'error');
      return res.status(500).json({ error: '[500] Failed to ban user.' });
    }
  });

  Router.post('/management._unban', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: '[400] Missing userId' });
      const data = await loadData(userId);
      if (!data?.account) return res.status(404).json({ error: '[404] User not found' });
      data.account.banned = false;
      await saveData(userId, data);
      return res.json({ success: true });
    } catch (err) {
      log(`[-] /management._unban: ${err}`, 'error');
      return res.status(500).json({ error: '[500] Failed to unban user.' });
    }
  });

  return Router;
};