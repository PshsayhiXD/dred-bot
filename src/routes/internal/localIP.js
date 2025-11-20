import express from 'express';

export default ({ getLocalIP }) => {
  const router = express.Router();
  router.get('/localIP', (req, res) => {
    const localIP = getLocalIP();
    res.status(200).json({ ip: localIP });
  });
  return router;
};