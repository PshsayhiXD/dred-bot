import express from 'express';
import paths from '../../utils/path.js';
export default ({}) => {
  const Router = express.Router();
  Router.get('/redirect/component.js', (req, res) => {
    res.sendFile(paths.html.component);
  });
  Router.get('/redirect/component.test.js', (req, res) => {
    res.sendFile(paths.html.component_test);
  });
  return Router;
}