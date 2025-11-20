import express from 'express';

export default ({ loadData, saveData }) => {
  const router = express.Router();
  router.post('/data', async (req, res) => {
    const { user, path, value } = req.body;
    if (!user || !Array.isArray(path) || path.length === 0) return res.status(400).send("[400] Invalid user or path.");
    let data = await loadData(user);
    data[user] ??= {};
    let current = data[user];
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      current[key] ??= {};
      current = current[key];
    }
    current[path[path.length - 1]] = value;
    await saveData(user, data);
    res.status(200).send('[200] Data Saved.');
  });
  router.delete('/data', async (req, res) => {
    const { user, path } = req.body;
    if (!user || !Array.isArray(path) || path.length === 0) return res.status(400).send("[400] Invalid user or path.");
    let data = await loadData(user);
    let current = data[user];
    if (!current) return res.status(404).send('[404] User not found.');
    for (let i = 0; i < path.length - 1; i++) {
      current = current?.[path[i]];
      if (current == null) return res.status(404).send('[404] Path not found.');
    }
    delete current[path[path.length - 1]];
    await saveData(user, data);
    res.status(200).send('[200] Data deleted.');
  });
  router.get('/data', async (req, res) => {
    const { user } = req.query;
    let path = req.query.path;
    if (!user) return res.status(400).send("[400] Missing user.");
    if (typeof path === 'string') {
      try { path = JSON.parse(path);
      } catch {return res.status(400).send("[400] Invalid path format. Must be JSON array.")}
    }
    if (!Array.isArray(path)) path = [];
    let data = await loadData(user);
    let current = data[user];
    for (const key of path) {
      if (current?.[key] == null) return res.status(404).send('[404] Path not found.');
      current = current[key];
    }
    res.status(200).json(current ?? {});
  });
  return router;
};