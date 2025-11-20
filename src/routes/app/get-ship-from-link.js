import express from 'express';
export default ({ fetchShipFromLink }) => {
  const Router = express.Router();
  Router.post("/get-ship-from-link", async (req, res) => {
    const { link } = req.body;
    const ships = await fetchShipFromLink(link);
    return ships;
  });
  Router.get("/get-ship-from-link", async (req, res) => {
    const { link } = req.query;
    const ships = await fetchShipFromLink(link);
    return ships;
  });
  return Router;
}