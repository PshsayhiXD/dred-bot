import express from 'express';
import paths from './../../utils/path.js';
export default ({ writeData, readData}) => {
  const router = express.Router();
  router.post('/MotdBackup', async (req, res) => {
    const { id, motd } = req.body;
    if (!id || !motd) return res.status(400).json({ success: false, message: '[400] Id or MOTD not provided.', status: 400 });
    const timestamp = Date.now();
    const data = await readData(paths.database.motdBackup);
    if (!data.id) data.id = {};
    if (!data.MOTD) data.MOTD = {};
    if (!data.id[id]) data.id[id] = [];
    const exist = data.id[id].some(entry => Object.values(entry)[0] === motd);
    if (exist) return res.status(409).json({ success: false, message: `[409] Duplicate MOTD (${exist}).`, status: 409 });
    data.id[id].push({ [timestamp]: motd });
    data.MOTD[`${id}_${timestamp}`] = motd;
    await writeData(paths.database.motdBackup, data);
    res.status(200).json({ success: true, message: '[200] MOTD saved.', status: 200 });
  });
  router.get('/MotdBackup/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: '[400] ShipId not provided.', status: 400 });
    const data = await readData(paths.database.motdBackup);
    if (!data.id || !data.id[id]) return res.status(404).json({ success: false, message: `[404] No MOTD found for ${id}.`, status: 404});
    res.status(200).json(data.id[id]);
  });
  router.delete('/MotdBackup/:id/:timestamp', async (req, res) => {
    const { id, timestamp } = req.params;
    const data = await readData(paths.database.motdBackup);
    if (!data.id?.[id] || !data.MOTD?.[`${id}_${timestamp}`]) return res.status(404).json({ success: false, message: 'Backup not found.', status: 404 });
    data.id[id] = data.id[id].filter(entry => !entry[timestamp]);
    delete data.MOTD[`${id}_${timestamp}`];
    await writeData(paths.database.motdBackup, data);
    res.status(200).json({ success: true, message: 'Backup deleted.', status: 202 });
  });

  return router;
};