import { Op } from 'sequelize';
import { RefreshToken } from '../models';

class RefreshTokenRepository {
  public create = (data: {
    token: string;
    userId: string;
    expiresAt: Date;
    deviceInfo?: string | null;
  }): Promise<RefreshToken> => {
    return RefreshToken.create({
      token: data.token,
      userId: data.userId,
      expiresAt: data.expiresAt,
      deviceInfo: data.deviceInfo ?? null,
    });
  };

  public findByToken = (token: string): Promise<RefreshToken | null> => {
    return RefreshToken.findOne({ where: { token } });
  };

  public deleteByToken = (token: string): Promise<number> => {
    return RefreshToken.destroy({ where: { token } });
  };

  public deleteAllForUser = (userId: string): Promise<number> => {
    return RefreshToken.destroy({ where: { userId } });
  };

  /** Housekeeping: remove expired rows. */
  public deleteExpired = (): Promise<number> => {
    return RefreshToken.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } });
  };
}

export const refreshTokenRepository = new RefreshTokenRepository();
