const express = require('express');
const cors = require('cors');
const pino = require('pino');
const pinoHttp = require('pino-http');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');

const ordersCreate = require('./routes/orders-create');
const ordersConfirmCancel = require('./routes/orders-confirm-cancel');

function createApp() {
  const app = express();
  const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

  app.use(cors());                 
  app.use(express.json());         
  app.use(pinoHttp({ logger }));   

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'orders-api' }));


  try {
    const doc = YAML.load('./openapi.yaml');
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(doc));
  } catch (e) {}

  app.use('/orders', ordersCreate);
  app.use('/orders', ordersConfirmCancel);
  
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'internal_error' });
  });


  app.get('/_routes', (_req, res) => {
  const list = [];
  app._router.stack.forEach((m) => {
    if (m.route) {
      const methods = Object.keys(m.route.methods).join(',').toUpperCase();
      list.push({ path: m.route.path, methods });
    } else if (m.name === 'router' && m.handle.stack) {
      const base = m.regexp?.toString() || '';
      m.handle.stack.forEach((h) => {
        if (h.route) {
          const methods = Object.keys(h.route.methods).join(',').toUpperCase();
          list.push({ base, path: h.route.path, methods });
        }
      });
    }
  });
  res.json(list);
});

  return app;
}

module.exports = { createApp };
