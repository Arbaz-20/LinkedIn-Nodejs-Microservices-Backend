import { Router } from 'express';
import { asyncHandler, validate, requireUser } from '@linkedin-clone/shared';
import { connectionController } from '../controllers/connection.controller';
import { followController } from '../controllers/follow.controller';
import { blockController } from '../controllers/block.controller';
import {
  sendRequestSchema,
  idParams,
  userIdParams,
  listConnectionsQuery,
} from '../validators/connection.validators';

export const connectionRouter = Router();

// Identity is injected by the gateway; every route requires an authenticated user.
connectionRouter.use(requireUser);

// ─── Connections ───────────────────────────────────────────
connectionRouter.get('/', validate({ query: listConnectionsQuery }), asyncHandler(connectionController.list));
connectionRouter.get('/requests/pending', asyncHandler(connectionController.pending));
connectionRouter.get('/mutual/:userId', validate({ params: userIdParams }), asyncHandler(connectionController.mutual));

connectionRouter.post('/request', validate({ body: sendRequestSchema }), asyncHandler(connectionController.request));
connectionRouter.put('/request/:id/accept', validate({ params: idParams }), asyncHandler(connectionController.accept));
connectionRouter.put('/request/:id/reject', validate({ params: idParams }), asyncHandler(connectionController.reject));
connectionRouter.delete('/request/:id', validate({ params: idParams }), asyncHandler(connectionController.withdraw));

// ─── Follows ───────────────────────────────────────────────
connectionRouter.get('/followers', asyncHandler(followController.followers));
connectionRouter.get('/following', asyncHandler(followController.following));
connectionRouter.post('/follow/:userId', validate({ params: userIdParams }), asyncHandler(followController.follow));
connectionRouter.delete('/follow/:userId', validate({ params: userIdParams }), asyncHandler(followController.unfollow));

// ─── Blocks ────────────────────────────────────────────────
connectionRouter.post('/block/:userId', validate({ params: userIdParams }), asyncHandler(blockController.block));
connectionRouter.delete('/block/:userId', validate({ params: userIdParams }), asyncHandler(blockController.unblock));
