import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';


export function createApp() {
const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });



app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));


app.get('/health', (_req, res) => {
res.json({ ok: true, service: 'orders-api' });
});


try {
const doc = YAML.load('./openapi.yaml');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(doc));
} catch (e) {}


app.use((err, _req, res, _next) => {
const status = err.status || 500;
res.status(status).json({ error: err.message || 'internal_error' });
});


return app;
}