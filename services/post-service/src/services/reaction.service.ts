import { NotFoundError } from '@linkedin-clone/shared';
import { Reaction, ReactionType } from '../models';
import { postRepository } from '../repositories/post.repository';
import { reactionRepository } from '../repositories/reaction.repository';
import { postAccessService } from './postAccess.service';
import { postEventPublisher } from '../events/publishers';

class ReactionService {
  /**
   * Add or change a reaction. A user has at most one reaction per post; the
   * like counter is only bumped when the reaction is newly created. Notifies the
   * author (post.reacted) on a fresh reaction.
   */
  public react = async (postId: string, userId: string, type: ReactionType = 'LIKE'): Promise<Reaction> => {
    const post = await postRepository.findById(postId);
    if (!post) throw new NotFoundError('Post not found');
    await postAccessService.assertCanView(post, userId);

    const existing = await reactionRepository.find(postId, userId);
    if (existing) {
      return existing.type === type ? existing : reactionRepository.updateType(existing, type);
    }

    const reaction = await reactionRepository.create(postId, userId, type);
    await postRepository.incrementCounter(postId, 'likesCount', 1);

    if (post.authorId !== userId) {
      await postEventPublisher.publishReacted({
        postId,
        authorId: post.authorId,
        actorId: userId,
        type,
      });
    }
    return reaction;
  };

  /** Remove the user's reaction, decrementing the counter if one existed. */
  public unreact = async (postId: string, userId: string): Promise<void> => {
    const post = await postRepository.findById(postId);
    if (!post) throw new NotFoundError('Post not found');
    await postAccessService.assertCanView(post, userId);

    const removed = await reactionRepository.delete(postId, userId);
    if (removed > 0) await postRepository.incrementCounter(postId, 'likesCount', -1);
  };
}

export const reactionService = new ReactionService();
