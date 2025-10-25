const { createApp } = require('./app');
const { config } = require('./config');

const app = createApp();
app.listen(config.port, () => {
  console.log(`[orders-api] listening on :${config.port}`);
});
