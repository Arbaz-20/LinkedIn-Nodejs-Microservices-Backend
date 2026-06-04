import { ForbiddenError } from '@linkedin-clone/shared';
import { Post } from '../models';
import { connectionClient } from '../clients/connection.client';

/**
 * Central read-access gate for a post. Every endpoint that reads or interacts
 * with a post (view, comment, react) must pass through here so visibility rules
 * are enforced uniformly and can't be bypassed via a guessed post id (IDOR).
 */
class PostAccessService {
  public assertCanView = async (post: Post, viewerId: string): Promise<void> => {
    if (post.authorId === viewerId || post.visibility === 'PUBLIC') return;
    if (post.visibility === 'PRIVATE') throw new ForbiddenError('This post is private');
    // CONNECTIONS — viewer must be an accepted connection of the author.
    const connectionIds = await connectionClient.getConnectionIds(post.authorId);
    if (!connectionIds.includes(viewerId)) throw new ForbiddenError('Connections-only post');
  };
}

export const postAccessService = new PostAccessService();
