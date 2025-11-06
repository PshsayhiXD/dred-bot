import express from 'express';

export default ({ loadAllData, saveData }) => {
  const Router = express.Router();
  Router.post('/logout', async (req, res) => {
    const authToken = req.cookies['d_sess'];
    const data = await loadAllData();
    const user = Object.values(data).find((u) => u.account?.cookie === authToken);
    if (user) user.account.cookie = null;
    else return res.status(404).send('[+] Account cookie not found.')
    await saveData(user, data);
    try { res.clearCookie('d_sess'); } catch (e) {}
    return res.status(200).send('[+] Logged out.');
  });
  return Router;
};
