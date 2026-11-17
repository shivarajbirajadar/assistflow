import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/index.js';
import { registerListeners } from './core/events.js';
import { apiLimiter, notFound, errorHandler } from './core/middleware.js';
import routes from './routes/index.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL.split(',').map((s) => s.trim()),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-actor-id'],
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
if (env.NODE_ENV !== 'production') app.use(morgan('dev'));

registerListeners();

// Health check (also used to warm up the free Render server)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', apiLimiter, routes);
app.use(notFound);
app.use(errorHandler);

export default app;