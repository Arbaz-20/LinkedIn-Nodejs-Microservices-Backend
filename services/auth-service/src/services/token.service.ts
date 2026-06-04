import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models';
import { refreshTokenRepository } from '../repositories/refreshToken.repository';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: User['role'];
}

class TokenService {
  /** Name of the httpOnly cookie carrying the refresh token. */
  public readonly refreshCookieName = 'refresh_token';

  /** Sign a short-lived access JWT carrying identity + role. */
  public signAccessToken = (user: User): string => {
    const claims: AccessTokenClaims = { sub: user.id, email: user.email, role: user.role };
    return jwt.sign(claims, config.JWT_ACCESS_SECRET, {
      expiresIn: config.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    });
  };

  /**
   * Issue an opaque refresh token, persist it, and return both the raw token and
   * its expiry. The raw token goes into an httpOnly cookie; the DB row makes it
   * revocable and rotatable.
   */
  public issueRefreshToken = async (userId: string, deviceInfo?: string | null) => {
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await refreshTokenRepository.create({ token, userId, expiresAt, deviceInfo });
    return { token, expiresAt };
  };

  /** Rotate: delete the presented token and mint a fresh one for the same user. */
  public rotateRefreshToken = async (oldToken: string, userId: string, deviceInfo?: string | null) => {
    await refreshTokenRepository.deleteByToken(oldToken);
    return this.issueRefreshToken(userId, deviceInfo);
  };

  /** Cookie options for the refresh-token cookie (scoped to the auth routes). */
  public refreshCookieOptions = () => {
    return {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      domain: config.COOKIE_DOMAIN,
      path: '/api/auth',
      maxAge: config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    };
  };
}

export const tokenService = new TokenService();
