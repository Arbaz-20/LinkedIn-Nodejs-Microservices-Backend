import { NextFunction, Request, Response, RequestHandler } from 'express';

/**
 * Wrap an async route handler so rejected promises are forwarded to Express'
 * error pipeline instead of crashing the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
