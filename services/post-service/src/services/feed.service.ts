import { buildCursorPage } from '@linkedin-clone/shared';
import { config } from '../config';
import { Post } from '../models';
import { postRepository } from '../repositories/post.repository';
import { connectionClient } from '../clients/connection.client';

export interface FeedPage {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

class FeedService {
  /**
   * Personalized feed: posts from the viewer's connections, follows, and self,
   * respecting visibility, keyset-paginated by createdAt.
   */
  public getFeed = async (userId: string, cursor?: string, limit = config.FEED_PAGE_SIZE): Promise<FeedPage> => {
    const [connectionIds, followingIds] = await Promise.all([
      connectionClient.getConnectionIds(userId),
      connectionClient.getFollowingIds(userId),
    ]);

    const authorIds = [...new Set([...connectionIds, ...followingIds, userId])];

    const rows = await postRepository.feedPage({ authorIds, connectionIds, viewerId: userId, cursor, limit });
    const { items, nextCursor, hasMore } = buildCursorPage(rows, limit, (p) => p.createdAt.toISOString());
    return { posts: items, nextCursor, hasMore };
  };
}

export const feedService = new FeedService();
