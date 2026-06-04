import { createLogger } from '@linkedin-clone/shared';
import { config } from '../config';

const logger = createLogger(config.SERVICE_NAME);

interface ConnectionRow {
  requesterId: string;
  addresseeId: string;
}
interface FollowRow {
  followingId: string;
}

/**
 * Thin HTTP client over connection-service. The feed needs a user's social
 * graph; we propagate the user's identity via the x-user-id header (the same
 * trusted header the gateway injects). Network failures degrade gracefully to
 * an empty graph so the feed still returns the user's own posts.
 */
class ConnectionClient {
  private readonly timeoutMs = 3000;

  private get = async <T>(path: string, userId: string): Promise<T | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${config.CONNECTION_SERVICE_URL}${path}`, {
        headers: { 'x-user-id': userId, accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) {
        logger.warn({ path, status: res.status }, 'connection-service non-2xx');
        return null;
      }
      const body = (await res.json()) as { data: T };
      return body.data;
    } catch (err) {
      logger.warn({ err, path }, 'connection-service request failed');
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  /** Accepted-connection partner ids for a user. */
  public getConnectionIds = async (userId: string): Promise<string[]> => {
    const rows = await this.get<ConnectionRow[]>('/api/connections', userId);
    if (!rows) return [];
    return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
  };

  /** Ids the user follows. */
  public getFollowingIds = async (userId: string): Promise<string[]> => {
    const rows = await this.get<FollowRow[]>('/api/connections/following', userId);
    if (!rows) return [];
    return rows.map((r) => r.followingId);
  };
}

export const connectionClient = new ConnectionClient();
