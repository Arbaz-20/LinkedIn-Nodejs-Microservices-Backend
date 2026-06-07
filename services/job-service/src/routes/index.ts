import { Router } from 'express';
import { jobRouter } from './job.routes';

export const router = Router();

router.use('/jobs', jobRouter);
