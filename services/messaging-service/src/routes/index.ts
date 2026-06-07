import { Router } from 'express';
import { messagingRouter } from './messaging.routes';

export const router = Router();

router.use('/messaging', messagingRouter);
