import express from 'express';

export default ({ log, key }, bot) => {
  const Router = express.Router();
  Router.post('/dm', async (req, res) => {
    const { pass, userId, message } = req.body;
    if (pass !== key.PRIVATE_APP_ROUTES_KEY)
    if (!userId || !message) return res.status(400).json({ success: false, message: '[400] Missing userId or message.' });
    try {
      const user = await bot.users.fetch(userId);
      if (!user) return res.status(404).json({ success: false, message: '[404] User not found.' });
      await user.send(message);
      res.json({ success: true, message: '[200] DM sent successfully.' });
    } catch (err) {
      log(`[-] DM error: ${err}`, 'error');
      res.status(500).json({ success: false, message: '[500] Failed to send DM.', error: err.message });
    }
  });
  return Router;
}