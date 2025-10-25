require('dotenv').config();

const config = {
  port: Number(process.env.PORT || 3001),
  db: {
    host: process.env.DB_HOST || 'mysql',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'changeme',
    database: process.env.DB_NAME || 'jelou'
  },
  serviceToken: process.env.SERVICE_TOKEN || 'service-secret-123',
  logLevel: process.env.LOG_LEVEL || 'info'
};

module.exports = { config };
