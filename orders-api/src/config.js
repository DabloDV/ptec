import dotenv from 'dotenv';
dotenv.config();


export const config = {
port: Number(process.env.PORT || 3002),
db: {
host: process.env.DB_HOST || 'localhost',
port: Number(process.env.DB_PORT || 3306),
user: process.env.DB_USER || 'root',
password: process.env.DB_PASSWORD || 'XXXX',
database: process.env.DB_NAME || 'jelou'
},
jwtSecret: process.env.JWT_SECRET || 'dev-secret',
serviceToken: process.env.SERVICE_TOKEN || 'service-secret-123',
customersInternalBase: process.env.CUSTOMERS_INTERNAL_BASE || 'http://localhost:3001',
logLevel: process.env.LOG_LEVEL || 'info'
};