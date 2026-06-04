import { Router } from 'express';
import { postRouter } from './post.routes';

export const router = Router();

router.use('/posts', postRouter);
