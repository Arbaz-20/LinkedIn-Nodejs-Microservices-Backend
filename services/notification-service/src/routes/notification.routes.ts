import { Router } from 'express';
import { asyncHandler, validate, requireUser } from '@linkedin-clone/shared';
import { notificationController } from '../controllers/notification.controller';
import { preferenceController } from '../controllers/preference.controller';
import {
  idParams,
  listNotificationsQuery,
  updatePreferencesSchema,
} from '../validators/notification.validators';

export const notificationRouter = Router();

// Identity is injected by the gateway; every route requires an authenticated user.
notificationRouter.use(requireUser);

// ─── Static paths (registered before /:id to avoid param capture) ──────────
notificationRouter.get('/unread-count', asyncHandler(notificationController.unreadCount));
notificationRouter.put('/read-all', asyncHandler(notificationController.markAllRead));

notificationRouter.get('/preferences', asyncHandler(preferenceController.get));
notificationRouter.put(
  '/preferences',
  validate({ body: updatePreferencesSchema }),
  asyncHandler(preferenceController.update),
);

// ─── Collection + param routes ─────────────────────────────────────────────
notificationRouter.get(
  '/',
  validate({ query: listNotificationsQuery }),
  asyncHandler(notificationController.list),
);
notificationRouter.put(
  '/:id/read',
  validate({ params: idParams }),
  asyncHandler(notificationController.markRead),
);
