import { Request, Response } from 'express';
import { ok, created, noContent } from '@linkedin-clone/shared';
import { authService, AuthResult } from '../services/auth.service';
import { tokenService } from '../services/token.service';

class AuthController {
  /** Truncated device fingerprint for the refresh-token row (audit/rotation). */
  private deviceInfo = (req: Request): string => {
    return (req.get('user-agent') ?? 'unknown').slice(0, 255);
  };

  /** Set the rotating refresh-token cookie and return the access token + user. */
  private sendSession = (res: Response, result: AuthResult, status = 200): Response => {
    res.cookie(tokenService.refreshCookieName, result.refreshToken, tokenService.refreshCookieOptions());
    return ok(res, { user: result.user, accessToken: result.accessToken }, status);
  };

  public register = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.register(req.body, this.deviceInfo(req));
    res.cookie(tokenService.refreshCookieName, result.refreshToken, tokenService.refreshCookieOptions());
    created(res, { user: result.user, accessToken: result.accessToken });
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.login(req.body, this.deviceInfo(req));
    this.sendSession(res, result);
  };

  public refresh = async (req: Request, res: Response): Promise<void> => {
    const presented = req.cookies?.[tokenService.refreshCookieName] as string | undefined;
    const result = await authService.refresh(presented, this.deviceInfo(req));
    this.sendSession(res, result);
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    const presented = req.cookies?.[tokenService.refreshCookieName] as string | undefined;
    await authService.logout(presented);
    res.clearCookie(tokenService.refreshCookieName, tokenService.refreshCookieOptions());
    noContent(res);
  };

  public forgotPassword = async (req: Request, res: Response): Promise<void> => {
    await authService.forgotPassword(req.body.email);
    // Always 200 regardless of whether the email exists.
    ok(res, { message: 'If the email is registered, a reset link has been sent.' });
  };

  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    await authService.resetPassword(req.body);
    ok(res, { message: 'Password has been reset.' });
  };

  public verifyEmail = async (req: Request, res: Response): Promise<void> => {
    await authService.verifyEmail(req.params.token);
    ok(res, { message: 'Email verified.' });
  };
}

export const authController = new AuthController();
