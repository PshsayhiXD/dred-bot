import express from 'express';
export default ({}) => {
  const Router = express.Router();
  const requestStats = {
    counts: { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 },
    recentRequests: [],
  };
  Router.use((req, res, next) => {
    const method = req.method.toUpperCase();
    if (requestStats.counts[method] !== undefined) {
      requestStats.counts[method]++;
      requestStats.recentRequests.push({
        method,
        path: req.path,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
      if (requestStats.recentRequests.length > 20) requestStats.recentRequests.shift();
    }
    next();
  });
  Router.get('/stats', (req, res) => {
    res.json({
      counts: requestStats.counts,
      recent: requestStats.recentRequests,
    });
  });
  return Router;
};
