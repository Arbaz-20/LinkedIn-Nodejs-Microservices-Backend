import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from '@linkedin-clone/shared';
import { config } from './config';
import { router } from './routes';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Liveness
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: config.SERVICE_NAME });
});

app.use('/api', router);

app.use(notFoundHandler);
app.use(errorHandler);
