import express from 'express';
export default ({ writeEnv, readEnv }) => {
  const router = express.Router();
  router.post('/cloudflare', async (req, res) => {
    const { _cf_clearance, clearance_expire, _cf__bm } = req.body;
    if (!_cf_clearance || !clearance_expire) return res.status(400).send('[400] Clearance or Expire not provided.');
    await writeEnv('CF_CLEARANCE', _cf_clearance);
    await writeEnv('CF_CLEARANCE_EXPIRE', clearance_expire);
    if (_cf__bm) await writeEnv('CF_BM', _cf__bm);
    res.status(200).send('[+] Cloudflare configured.');
  });
  router.get('/cloudflare', async (req, res) => {
    const expire = await readEnv('CF_CLEARANCE_EXPIRE');
    if (!expire) return res.status(404).send('[404] Cloudflare clearance not configured.');
    if (new Date(expire) < new Date()) return res.status(403).send('[403] Cloudflare clearance expired.');
    if (!(await readEnv('CF_CLEARANCE'))) return res.status(404).send('[404] _cf_Clearance not configured.');
    res.status(200).send(cloudflare);
  });

  return router;
};