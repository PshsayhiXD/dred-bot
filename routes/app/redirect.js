import express from 'express';
import paths from '../../utils/path.js';
export default ({}) => {
  const Router = express.Router();

  Router.get('/redirect/privacy', (req, res) => {
    res.sendFile(paths.public.privacy);
  });

  Router.get('/redirect/home', (req, res) => {
    res.sendFile(paths.public.index);
  });
  Router.get('/redirect/homepage', (req, res) => {
    res.sendFile(paths.public.index);
  });
  return Router;
};