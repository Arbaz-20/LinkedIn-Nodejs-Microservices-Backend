import { z } from 'zod';

/** Reusable password rule — min 8 chars, at least one letter and one digit. */
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a digit');

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(254),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyParamsSchema = z.object({
  token: z.string().min(1),
});
