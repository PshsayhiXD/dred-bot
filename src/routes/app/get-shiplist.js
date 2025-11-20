import express from 'express';
export default ({ fetchShipList }) => {
  const Router = express.Router();
  Router.post("/get-shiplist", async (req, res) => {
    const ships = await fetchShipList();
    return ships;
  });
  Router.get("/get-shiplist", async (req, res) => {
    const ships = await fetchShipList();
    return ships;
  });
  return Router;
}