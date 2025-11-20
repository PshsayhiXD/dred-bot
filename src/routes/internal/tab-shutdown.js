import express from 'express';
export default ({ removeTab, log }) => {
  const router = express.Router();
  router.post('/tab-shutdown', async (req, res) => {
    const { shipId } = req.body;
    if (!shipId) return res.status(400).json({ error: "[400] Missing shipId.", status: 400 });
    try {
      await removeTab(shipId);
      res.json({ success: true, shipId });
    } catch (err) {
      log(`[-] /tab-shutdown err: ${err}`, "error");
      res.status(500).json({
        error: "[-] Internal server error.",
        status: 500
      });
    }
  });

  return router;
};