import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler, notFoundHandler, rateLimiter } from '@linkedin-clone/shared';
import { config } from './config';
import { registerProxies } from './routes/proxy';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.NODE_ENV === 'production' ? undefined : true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Liveness
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: config.SERVICE_NAME });
});

// Global rate limit across all proxied API traffic
app.use(
  '/api',
  rateLimiter({
    windowSeconds: config.RATE_LIMIT_WINDOW_SECONDS,
    max: config.RATE_LIMIT_MAX,
    prefix: 'rate:gw',
  }),
);

// Authenticated proxy routes
registerProxies(app);

app.use(notFoundHandler);
app.use(errorHandler);
