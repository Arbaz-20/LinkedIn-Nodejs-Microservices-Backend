import { ForbiddenError, NotFoundError, getRedis, createLogger } from '@linkedin-clone/shared';
import { config } from '../config';
import { Notification } from '../models';
import {
  notificationRepository,
  CreateNotificationData,
} from '../repositories/notification.repository';

const logger = createLogger(config.SERVICE_NAME);

const UNREAD_TTL_SECONDS = 30;
const unreadKey = (userId: string): string => `unread:${userId}`;

class NotificationService {
  /** Whether a Redis cache is available for the unread-count cache. */
  private get redisEnabled(): boolean {
    return Boolean(config.REDIS_URL);
  }

  private invalidateUnread = async (userId: string): Promise<void> => {
    if (!this.redisEnabled) return;
    try {
      await getRedis().del(unreadKey(userId));
    } catch (err) {
      logger.warn({ err, userId }, 'failed to invalidate unread cache');
    }
  };

  /** Load a notification or throw 404. */
  private getOrThrow = async (id: string): Promise<Notification> => {
    const row = await notificationRepository.findById(id);
    if (!row) throw new NotFoundError('Notification not found');
    return row;
  };

  /** Create a notification and invalidate the recipient's cached unread count. */
  public create = async (data: CreateNotificationData): Promise<Notification> => {
    const row = await notificationRepository.create(data);
    await this.invalidateUnread(data.recipientId);
    return row;
  };

  /** Cursor-paginated list of a user's notifications (created_at desc). */
  public list = (
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<Notification[]> => {
    return notificationRepository.listForRecipient(userId, limit, cursor);
  };

  /** Count of unread notifications, optionally cached in Redis for 30s. */
  public unreadCount = async (userId: string): Promise<number> => {
    if (this.redisEnabled) {
      try {
        const redis = getRedis();
        const cached = await redis.get(unreadKey(userId));
        if (cached !== null) return Number.parseInt(cached, 10) || 0;
        const count = await notificationRepository.countUnread(userId);
        await redis.set(unreadKey(userId), String(count), 'EX', UNREAD_TTL_SECONDS);
        return count;
      } catch (err) {
        logger.warn({ err, userId }, 'unread cache unavailable, falling back to db');
      }
    }
    return notificationRepository.countUnread(userId);
  };

  /** Mark a single notification read — only the recipient may do so. */
  public markRead = async (id: string, userId: string): Promise<Notification> => {
    const row = await this.getOrThrow(id);
    if (row.recipientId !== userId) throw new ForbiddenError('Not your notification');
    if (!row.isRead) {
      await notificationRepository.update(row, { isRead: true, readAt: new Date() });
      await this.invalidateUnread(userId);
    }
    return row;
  };

  /** Mark all of a user's unread notifications read. Returns the updated count. */
  public markAllRead = async (userId: string): Promise<number> => {
    const updated = await notificationRepository.markAllRead(userId);
    await this.invalidateUnread(userId);
    return updated;
  };
}

export const notificationService = new NotificationService();
