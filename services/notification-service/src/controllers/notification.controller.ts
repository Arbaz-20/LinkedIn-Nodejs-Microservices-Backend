import { Request, Response } from 'express';
import { ok, parseCursorPagination, buildCursorPage } from '@linkedin-clone/shared';
import { notificationService } from '../services/notification.service';
import { Notification } from '../models';

class NotificationController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const { limit, cursor } = parseCursorPagination(req.query, { limit: 20, maxLimit: 50 });
    const rows = await notificationService.list(req.userId!, limit, cursor);
    const { items, nextCursor, hasMore } = buildCursorPage(rows, limit, (n: Notification) =>
      n.createdAt.toISOString(),
    );
    ok(res, items, 200, { nextCursor, hasMore });
  };

  public unreadCount = async (req: Request, res: Response): Promise<void> => {
    const count = await notificationService.unreadCount(req.userId!);
    ok(res, { count });
  };

  public markRead = async (req: Request, res: Response): Promise<void> => {
    ok(res, await notificationService.markRead(req.params.id, req.userId!));
  };

  public markAllRead = async (req: Request, res: Response): Promise<void> => {
    const updated = await notificationService.markAllRead(req.userId!);
    ok(res, { updated });
  };
}

export const notificationController = new NotificationController();
