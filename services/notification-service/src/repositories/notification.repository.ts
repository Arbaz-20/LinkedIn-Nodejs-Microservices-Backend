import { Op, WhereOptions } from 'sequelize';
import { Notification, NotificationType } from '../models';

export interface CreateNotificationData {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType?: string | null;
  entityId?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
}

class NotificationRepository {
  public findById = (id: string): Promise<Notification | null> => {
    return Notification.findByPk(id);
  };

  public create = (data: CreateNotificationData): Promise<Notification> => {
    return Notification.create({
      recipientId: data.recipientId,
      actorId: data.actorId ?? null,
      type: data.type,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      message: data.message,
      readAt: null,
      metadata: data.metadata ?? null,
    });
  };

  /**
   * Cursor-paginated list of a user's notifications (created_at desc). Fetches
   * `limit + 1` so the caller can detect whether more pages exist.
   */
  public listForRecipient = (
    recipientId: string,
    limit: number,
    cursor?: string,
  ): Promise<Notification[]> => {
    const where: WhereOptions = { recipientId };
    if (cursor) {
      (where as Record<string, unknown>).createdAt = { [Op.lt]: new Date(cursor) };
    }
    return Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: limit + 1,
    });
  };

  public countUnread = (recipientId: string): Promise<number> => {
    return Notification.count({ where: { recipientId, isRead: false } });
  };

  public update = (row: Notification, changes: Partial<Notification>): Promise<Notification> => {
    return row.update(changes);
  };

  /** Mark every unread notification for a recipient as read. Returns the count. */
  public markAllRead = async (recipientId: string): Promise<number> => {
    const [affected] = await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { recipientId, isRead: false } },
    );
    return affected;
  };
}

export const notificationRepository = new NotificationRepository();
