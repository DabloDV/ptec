const express = require('express');
const cors = require('cors');
const pino = require('pino');
const pinoHttp = require('pino-http');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');
const internalRoutes = require('./routes/internal');

function createApp() {
  const app = express();
  const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'customers-api' }));

  try {
    const doc = YAML.load('./openapi.yaml');
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(doc));
  } catch (e) {}

  app.use(internalRoutes);

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'internal_error' });
  });

  return app;
}

module.exports = { createApp };
