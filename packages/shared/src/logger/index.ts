import pino, { Logger } from 'pino';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Create a named structured logger. Each service creates its own child with the
 * service name so logs are attributable across the bus.
 */
export function createLogger(serviceName: string): Logger {
  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: serviceName },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(isProd
      ? {}
      : {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
          },
        }),
  });
}

/** Default logger for code that has no service context (e.g. shared internals). */
export const logger = createLogger(process.env.SERVICE_NAME ?? 'shared');

export type { Logger };
