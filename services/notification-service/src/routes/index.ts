import { Router } from 'express';
import { notificationRouter } from './notification.routes';

export const router = Router();

router.use('/notifications', notificationRouter);
