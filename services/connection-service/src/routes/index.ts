import { Router } from 'express';
import { connectionRouter } from './connection.routes';

export const router = Router();

router.use('/connections', connectionRouter);
