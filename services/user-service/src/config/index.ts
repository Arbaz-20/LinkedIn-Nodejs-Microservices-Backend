import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3002),
  SERVICE_NAME: z.string().default('user-service'),
  DATABASE_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),

  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  PROFILE_CACHE_TTL_SECONDS: z.coerce.number().default(600),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid user-service configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export const isProd = config.NODE_ENV === 'production';
export type Config = typeof config;
