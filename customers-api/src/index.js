require('dotenv').config();
const express = require('express');
const { jwtAuth } = require('./middleware/jwtAuth');

const app = express();
app.use(express.json());


app.get('/health', (_req, res) => res.json({ ok: true, service: 'customers-api' }));


try {
  app.use(require('./routes/internal'));
} catch (e) {
  console.warn('[customers-api] internal routes disabled:', e.message);
}


try {
  const customersRouter = require('./routes/customers');
  app.use(jwtAuth, customersRouter); 
} catch (e) {
  console.warn('[customers-api] customers routes disabled:', e.message);
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'internal_error' });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`[customers-api] listening on port ${port}`);
});
