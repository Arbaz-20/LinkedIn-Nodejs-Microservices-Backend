import { RequestHandler } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';

/**
 * Express request augmentation: downstream services read identity from the
 * gateway-injected headers, never from a JWT.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

export type UserRole = 'USER' | 'ADMIN' | 'RECRUITER';

/**
 * Populate req.userId / req.userRole from the trusted gateway headers
 * (x-user-id / x-user-role) and require that a user id is present.
 *
 * Services sit behind the gateway, which is the only component that verifies
 * JWTs; these headers are therefore trusted within the private network.
 */
export const requireUser: RequestHandler = (req, _res, next) => {
  const userId = req.header('x-user-id');
  const role = req.header('x-user-role');
  if (!userId) {
    next(new UnauthorizedError('Missing authenticated user context'));
    return;
  }
  req.userId = userId;
  req.userRole = role ?? 'USER';
  next();
};

/** Soft variant: populate identity if present, but do not require it. */
export const optionalUser: RequestHandler = (req, _res, next) => {
  const userId = req.header('x-user-id');
  if (userId) {
    req.userId = userId;
    req.userRole = req.header('x-user-role') ?? 'USER';
  }
  next();
};

/** Require the authenticated user to hold one of the given roles. */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.userId) {
      next(new UnauthorizedError('Missing authenticated user context'));
      return;
    }
    if (!roles.includes((req.userRole ?? 'USER') as UserRole)) {
      next(new ForbiddenError('Insufficient role'));
      return;
    }
    next();
  };
}
