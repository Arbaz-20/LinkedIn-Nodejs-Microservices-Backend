import { User, Role } from '../models';

/** All User data-access lives here; services never call the model directly. */
class UserRepository {
  public findById = (id: string): Promise<User | null> => {
    return User.findByPk(id);
  };

  public findByEmail = (email: string): Promise<User | null> => {
    return User.findOne({ where: { email: email.toLowerCase() } });
  };

  public findByVerifyToken = (token: string): Promise<User | null> => {
    return User.findOne({ where: { verifyToken: token } });
  };

  public findByResetToken = (token: string): Promise<User | null> => {
    return User.findOne({ where: { resetToken: token } });
  };

  public create = (data: {
    email: string;
    passwordHash?: string | null;
    verifyToken?: string | null;
    isVerified?: boolean;
    role?: Role;
  }): Promise<User> => {
    return User.create({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash ?? null,
      verifyToken: data.verifyToken ?? null,
      isVerified: data.isVerified ?? false,
      role: data.role ?? 'USER',
      resetToken: null,
      resetExpiry: null,
      lastLoginAt: null,
    });
  };

  public update = (user: User, changes: Partial<User>): Promise<User> => {
    return user.update(changes);
  };
}

export const userRepository = new UserRepository();
