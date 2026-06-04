import bcrypt from 'bcryptjs';

class PasswordService {
  private readonly saltRounds = 12;

  /** Hash a plaintext password for storage. */
  public hash = (plain: string): Promise<string> => {
    return bcrypt.hash(plain, this.saltRounds);
  };

  /** Constant-time compare of a plaintext password against a stored hash. */
  public verify = (plain: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(plain, hash);
  };
}

export const passwordService = new PasswordService();
