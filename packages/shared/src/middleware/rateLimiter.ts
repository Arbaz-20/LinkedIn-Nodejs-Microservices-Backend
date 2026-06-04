import { RequestHandler } from 'express';
import { getRedis } from '../redis/client';
import { TooManyRequestsError } from '../errors/AppError';
import { logger } from '../logger';

export interface RateLimitOptions {
  /** Window length in seconds. */
  windowSeconds: number;
  /** Max requests allowed per window. */
  max: number;
  /** Key prefix, e.g. "rate:login". */
  prefix?: string;
  /** Resolve the identity to rate-limit on. Defaults to client IP. */
  keyResolver?: (req: Parameters<RequestHandler>[0]) => string;
}

/**
 * Fixed-window rate limiter backed by Redis INCR + EXPIRE. Sets standard
 * RateLimit headers and throws 429 when the window budget is exceeded.
 *
 * Fails open: if Redis is unreachable the request is allowed (availability over
 * strict enforcement), but the failure is logged.
 */
export function rateLimiter(options: RateLimitOptions): RequestHandler {
  const { windowSeconds, max, prefix = 'rate' } = options;
  const keyResolver =
    options.keyResolver ?? ((req) => req.ip ?? req.socket.remoteAddress ?? 'unknown');

  return async (req, res, next) => {
    const id = keyResolver(req);
    const key = `${prefix}:${id}:${req.path}`;
    try {
      const redis = getRedis();
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      const ttl = await redis.ttl(key);
      const remaining = Math.max(0, max - count);

      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(ttl >= 0 ? ttl : windowSeconds));

      if (count > max) {
        res.setHeader('Retry-After', String(ttl >= 0 ? ttl : windowSeconds));
        throw new TooManyRequestsError('Rate limit exceeded, slow down');
      }
      next();
    } catch (err) {
      if (err instanceof TooManyRequestsError) {
        next(err);
        return;
      }
      logger.warn({ err }, 'rate limiter unavailable — allowing request (fail open)');
      next();
    }
  };
}
