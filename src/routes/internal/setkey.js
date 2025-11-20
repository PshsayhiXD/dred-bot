import express from 'express';
export default ({ readEnv, writeEnv }) => {
  const router = express.Router();
  router.post('/setkey', async (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).send('[400] Key and value not provided.');
    if (!(await readEnv(key))) return res.status(404).send(`[404] ${key} not configured.`);
    await writeEnv(key, value);
    res.status(200).send('[+] saved key.');
  });
  router.get('/setkey', async (req, res) => {
    const { key } = req.query;
    if (!key) return res.status(400).send('[400] Key not provided.');
    const value = await readEnv(key);
    if (!value) return res.status(404).send(`[404] ${key} not configured.`);
    res.status(200).json({ value });
  });

  return router;
};
