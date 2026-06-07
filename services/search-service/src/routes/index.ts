import { Router } from 'express';
import { searchRouter } from './search.routes';

export const router = Router();

router.use('/search', searchRouter);
