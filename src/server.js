import compression from 'compression';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

const env = process.env.NODE_ENV || 'development';
const port = Number(process.env.PORT || 3000);
const serviceName = process.env.SERVICE_NAME || 'rusyugtrans-api';
const corsOrigin = process.env.CORS_ORIGIN || '*';

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.FORM_LIMIT || '1mb' }));
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()) }));
app.use(morgan(env === 'production' ? 'combined' : 'dev'));

// ✅ HEALTH
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: serviceName,
    environment: env,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: env === 'production' ? 'Internal Server Error' : err.message
  });
});

// 👇 ВАЖНО: экспорт app для тестов
export default app;

// 👇 запуск только если НЕ тест
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`${serviceName} listening on port ${port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}