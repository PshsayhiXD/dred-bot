import express from 'express';
import paths from '../utils/path.js';
import helmet from 'helmet';
import cors from 'cors';
import { helper }  from '../utils/helper.js';

const corsOptions = {
  origin: '*',
  allowedHeaders: ['x-api-key', 'Content-Type'],
};

const localIP = await helper.getLocalIP();

export const Middleware = async (app) => {
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use('/bootstrap', express.static(paths.public.bootstrap.dirRoot));
  app.use(express.static(paths.public.dirRoot));
  app.use(express.urlencoded({ extended: true }));
  app.use(helmet());
  app.use(async (req, res, next) => {
    const localIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1', localIP];
    if ( localIps.includes(req.ip) ||
      (req.connection?.remoteAddress && 
      localIps.includes(req.connection.remoteAddress))
    ) return next();
    if (req.headers['x-api-key'] !== (await helper.readEnv('HTTP_ACCESS_TOKEN'))) {
      helper.log(`Unauthorized access attempt detected. ip: ${req.ip}, headers: ${req.headers}`);
      return res.status(403).send('[403] Forbidden.');
    }
    next();
  });
};
