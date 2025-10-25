const { config } = require('../config');

function serviceAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || token !== config.serviceToken) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

module.exports = { serviceAuth };