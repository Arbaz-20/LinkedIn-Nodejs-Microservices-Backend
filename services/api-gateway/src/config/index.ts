import 'dotenv/config';
import { z } from 'zod';

/**
 * Validate and freeze gateway configuration at boot. Missing required vars
 * fail the process immediately with a readable message.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  SERVICE_NAME: z.string().default('api-gateway'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  REDIS_URL: z.string().url(),

  AUTH_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  USER_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  CONNECTION_SERVICE_URL: z.string().url().default('http://localhost:3003'),
  POST_SERVICE_URL: z.string().url().default('http://localhost:3004'),
  MESSAGING_SERVICE_URL: z.string().url().default('http://localhost:3005'),
  NOTIFICATION_SERVICE_URL: z.string().url().default('http://localhost:3006'),
  SEARCH_SERVICE_URL: z.string().url().default('http://localhost:3007'),
  MEDIA_SERVICE_URL: z.string().url().default('http://localhost:3008'),
  JOB_SERVICE_URL: z.string().url().default('http://localhost:3009'),

  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(60),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid api-gateway configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
