import express from 'express';
import paths from '../../utils/path.js';
export default ({}) => {
  const Router = express.Router();

  Router.get('/redirect/privacy', (req, res) => {
    res.sendFile(paths.public.privacy);
  });

  Router.get('/redirect/terms', (req, res) => {
    res.sendFile(paths.public.terms);
  });
  Router.get('/redirect/term', (req, res) => {
    res.sendFile(paths.public.terms);
  });

  Router.get('/redirect/home', (req, res) => {
    res.sendFile(paths.public.index);
  });
  Router.get('/redirect/homepage', (req, res) => {
    res.sendFile(paths.public.index);
  });

  Router.get('/redirect/loginsignup.html', (req, res) => {
    res.sendFile(paths.public.loginsignup);
  });

  Router.get('/redirect/forgotpass.html', (req, res) => {
    res.sendFile(paths.public.forgotpass);
  });

  Router.get('/redirect/404.html', (req, res) => {
    res.sendFile(paths.public['404']);
  });
  Router.get('/redirect/404', (req, res) => {
    res.sendFile(paths.public['404']);
  });
  return Router;
};