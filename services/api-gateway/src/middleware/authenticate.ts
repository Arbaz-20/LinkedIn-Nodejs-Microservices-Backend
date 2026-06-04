import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'RECRUITER';
  iat: number;
  exp: number;
}

/**
 * Verify the access token from the Authorization header. On success, inject the
 * trusted identity headers (x-user-id / x-user-role) that downstream services
 * read. Strips any client-supplied identity headers first to prevent spoofing.
 */
export const authenticate: RequestHandler = (req, res, next) => {
  // Never trust inbound identity headers from clients.
  delete req.headers['x-user-id'];
  delete req.headers['x-user-role'];

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), config.JWT_ACCESS_SECRET) as JwtPayload;
    req.headers['x-user-id'] = payload.sub;
    req.headers['x-user-role'] = payload.role;
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
};
