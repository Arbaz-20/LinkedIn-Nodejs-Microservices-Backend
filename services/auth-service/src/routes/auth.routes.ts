import { Router } from 'express';
import { asyncHandler, validate } from '@linkedin-clone/shared';
import { authController } from '../controllers/auth.controller';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyParamsSchema,
} from '../validators/auth.validators';

export const authRouter = Router();

authRouter.post('/register', validate({ body: registerSchema }), asyncHandler(authController.register));
authRouter.post('/login', validate({ body: loginSchema }), asyncHandler(authController.login));
authRouter.post('/refresh', asyncHandler(authController.refresh));
authRouter.post('/logout', asyncHandler(authController.logout));

authRouter.post(
  '/forgot-password',
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword),
);
authRouter.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword),
);

authRouter.get('/verify/:token', validate({ params: verifyParamsSchema }), asyncHandler(authController.verifyEmail));
