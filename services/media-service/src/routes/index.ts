import { Router } from 'express';
import { mediaRouter } from './media.routes';

export const router = Router();

router.use('/media', mediaRouter);
