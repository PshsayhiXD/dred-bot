import express from "express";
import paths from "../../utils/path.js";

export default ({}) => {
  const Router = express.Router();
  Router.get("/component.js", (req, res) => {
    res.type("application/javascript");
    res.sendFile(paths.public.component);
  });
  Router.get("/component.test.js", (req, res) => {
    res.type("application/javascript");
    res.sendFile(paths.public.component_test);
  });
  return Router;
};