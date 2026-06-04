import crypto from 'node:crypto';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  createLogger,
} from '@linkedin-clone/shared';
import { config } from '../config';
import { User } from '../models';
import { userRepository } from '../repositories/user.repository';
import { refreshTokenRepository } from '../repositories/refreshToken.repository';
import { passwordService } from './password.service';
import { tokenService } from './token.service';
import { userEventPublisher } from '../events/publishers';
import type {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
} from '../validators/auth.validators';

const logger = createLogger(config.SERVICE_NAME);

/** Shape returned to controllers after a successful authentication. */
export interface AuthResult {
  user: { id: string; email: string; role: User['role']; isVerified: boolean };
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

/**
 * Auth service — owns the registration/login/token lifecycle. Controllers call
 * into here; all data access goes through repositories.
 */
class AuthService {
  /** Reset-token validity window. */
  private readonly resetTokenTtlMs = 60 * 60 * 1000; // 1 hour

  /**
   * Hash emailed tokens (verify / reset) before they touch the database, so a DB
   * leak can't be replayed to verify or take over accounts. The plaintext only
   * ever lives in the email we send; we compare by hashing the presented value.
   */
  private hashToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
  };

  private toPublicUser = (user: User): AuthResult['user'] => {
    return { id: user.id, email: user.email, role: user.role, isVerified: user.isVerified };
  };

  private buildSession = async (user: User, deviceInfo?: string | null): Promise<AuthResult> => {
    const accessToken = tokenService.signAccessToken(user);
    const { token: refreshToken, expiresAt } = await tokenService.issueRefreshToken(user.id, deviceInfo);
    return { user: this.toPublicUser(user), accessToken, refreshToken, refreshExpiresAt: expiresAt };
  };

  /** Create an account, emit user.registered, and start a session. */
  public register = async (input: RegisterInput, deviceInfo?: string | null): Promise<AuthResult> => {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await passwordService.hash(input.password);
    // Plaintext goes in the verification email; only the hash is persisted.
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      verifyToken: this.hashToken(verifyToken),
      isVerified: false,
    });

    // Profile creation + search indexing happen asynchronously via the event bus.
    await userEventPublisher.publishUserRegistered({
      userId: user.id,
      email: user.email,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    logger.info({ userId: user.id }, 'user registered');
    return this.buildSession(user, deviceInfo);
  };

  /** Validate credentials and start a session. */
  public login = async (input: LoginInput, deviceInfo?: string | null): Promise<AuthResult> => {
    const user = await userRepository.findByEmail(input.email);
    // Uniform error to avoid leaking which accounts exist.
    if (!user || !user.passwordHash) throw new UnauthorizedError('Invalid email or password');

    const valid = await passwordService.verify(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid email or password');

    await userRepository.update(user, { lastLoginAt: new Date() });
    return this.buildSession(user, deviceInfo);
  };

  /** Rotate a refresh token, returning a fresh access + refresh pair. */
  public refresh = async (
    presentedToken: string | undefined,
    deviceInfo?: string | null,
  ): Promise<AuthResult> => {
    if (!presentedToken) throw new UnauthorizedError('Missing refresh token');

    const stored = await refreshTokenRepository.findByToken(presentedToken);
    if (!stored) throw new UnauthorizedError('Invalid refresh token');

    if (stored.expiresAt.getTime() <= Date.now()) {
      await refreshTokenRepository.deleteByToken(presentedToken);
      throw new UnauthorizedError('Refresh token expired');
    }

    const user = await userRepository.findById(stored.userId);
    if (!user) {
      await refreshTokenRepository.deleteByToken(presentedToken);
      throw new UnauthorizedError('Invalid refresh token');
    }

    const { token: refreshToken, expiresAt } = await tokenService.rotateRefreshToken(
      presentedToken,
      user.id,
      deviceInfo,
    );
    const accessToken = tokenService.signAccessToken(user);
    return { user: this.toPublicUser(user), accessToken, refreshToken, refreshExpiresAt: expiresAt };
  };

  /** Revoke a single refresh token (logout this device). */
  public logout = async (presentedToken: string | undefined): Promise<void> => {
    if (presentedToken) await refreshTokenRepository.deleteByToken(presentedToken);
  };

  /**
   * Begin a password reset. Always succeeds from the caller's perspective so we
   * don't reveal whether an email is registered; the token is returned for the
   * notification-service to email (wired later).
   */
  public forgotPassword = async (email: string): Promise<{ resetToken: string | null }> => {
    const user = await userRepository.findByEmail(email);
    if (!user) return { resetToken: null };

    // Plaintext is emailed to the user; only the hash is persisted.
    const resetToken = crypto.randomBytes(32).toString('hex');
    await userRepository.update(user, {
      resetToken: this.hashToken(resetToken),
      resetExpiry: new Date(Date.now() + this.resetTokenTtlMs),
    });
    logger.info({ userId: user.id }, 'password reset requested');
    return { resetToken };
  };

  /** Complete a password reset and revoke all existing sessions. */
  public resetPassword = async (input: ResetPasswordInput): Promise<void> => {
    const user = await userRepository.findByResetToken(this.hashToken(input.token));
    if (!user || !user.resetExpiry || user.resetExpiry.getTime() <= Date.now()) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const passwordHash = await passwordService.hash(input.password);
    await userRepository.update(user, { passwordHash, resetToken: null, resetExpiry: null });
    // Force re-login everywhere after a password change.
    await refreshTokenRepository.deleteAllForUser(user.id);
    logger.info({ userId: user.id }, 'password reset completed');
  };

  /** Mark an account verified given its emailed verify token. */
  public verifyEmail = async (token: string): Promise<void> => {
    const user = await userRepository.findByVerifyToken(this.hashToken(token));
    if (!user) throw new NotFoundError('Invalid verification token');
    if (user.isVerified) return;
    await userRepository.update(user, { isVerified: true, verifyToken: null });
    logger.info({ userId: user.id }, 'email verified');
  };
}

export const authService = new AuthService();
