import express from 'express';
export default ({ loadAllData, saveData, log }) => {
  const Router = express.Router();
  Router.post('/change-password', async (req, res) => {
    try {
      const authToken = req.cookies['d_sess'];
      if (!authToken) return res.status(401).json({ success: false, message: '[401] No cookie.' });
      const { oldPassword, newPassword, confirmPassword } = req.body;
      if (!oldPassword || !newPassword || !confirmPassword) return res.status(400).json({ success: false, message: '[400] Missing fields.' });
      if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: '[400] Failed.' });
      const data = await loadAllData();
      const username = Object.keys(data).find(user => data[user].account.cookie === authToken);
      if (!username) return res.status(404).json({ success: false, message: '[404] Failed.' });
      const user = data[username];
      if (user.account.password !== oldPassword) return res.status(403).json({ success: false, message: '[403] Failed.' });
      user.account.password = newPassword;
      await saveData(user, data);
      res.status(200).json({ success: true, message: '[+] Successfully.' });
    } catch (err) {
      log(`[-] Error in /change-password: ${err}`, 'error');
      res.status(500).json({ success: false, message: '[500] Internal server error', err: err.message });
    }
  });
  return Router;
}