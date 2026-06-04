import { BadRequestError, ForbiddenError, NotFoundError, buildCursorPage } from '@linkedin-clone/shared';
import { config } from '../config';
import { Comment } from '../models';
import { commentRepository } from '../repositories/comment.repository';
import { postRepository } from '../repositories/post.repository';
import { postAccessService } from './postAccess.service';
import { postEventPublisher } from '../events/publishers';
import type { CreateCommentInput } from '../validators/post.validators';

export interface CommentPage {
  comments: Comment[];
  nextCursor: string | null;
  hasMore: boolean;
}

class CommentService {
  public list = async (
    postId: string,
    viewerId: string,
    cursor?: string,
    limit = config.FEED_PAGE_SIZE,
  ): Promise<CommentPage> => {
    const post = await postRepository.findById(postId);
    if (!post) throw new NotFoundError('Post not found');
    await postAccessService.assertCanView(post, viewerId);
    const rows = await commentRepository.listThreaded(postId, limit, cursor);
    const { items, nextCursor, hasMore } = buildCursorPage(rows, limit, (c) => c.createdAt.toISOString());
    return { comments: items, nextCursor, hasMore };
  };

  public create = async (postId: string, authorId: string, input: CreateCommentInput): Promise<Comment> => {
    const post = await postRepository.findById(postId);
    if (!post) throw new NotFoundError('Post not found');
    await postAccessService.assertCanView(post, authorId);

    // A reply's parent must belong to the same post.
    if (input.parentId) {
      const parent = await commentRepository.findById(input.parentId);
      if (!parent || parent.postId !== postId) throw new BadRequestError('Invalid parent comment');
    }

    const comment = await commentRepository.create({
      postId,
      authorId,
      content: input.content,
      parentId: input.parentId ?? null,
    });
    await postRepository.incrementCounter(postId, 'commentsCount', 1);

    if (post.authorId !== authorId) {
      await postEventPublisher.publishCommented({
        postId,
        authorId: post.authorId,
        actorId: authorId,
        commentId: comment.id,
      });
    }
    return comment;
  };

  public update = async (commentId: string, authorId: string, content: string): Promise<Comment> => {
    const comment = await commentRepository.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');
    if (comment.authorId !== authorId) throw new ForbiddenError('Not your comment');
    return commentRepository.update(comment, { content });
  };

  /** Delete a comment (author only). Direct replies cascade; the post counter is corrected. */
  public remove = async (commentId: string, authorId: string): Promise<void> => {
    const comment = await commentRepository.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');
    if (comment.authorId !== authorId) throw new ForbiddenError('Not your comment');

    const removedCount = await commentRepository.countWithReplies(commentId);
    await commentRepository.delete(commentId);
    await postRepository.incrementCounter(comment.postId, 'commentsCount', -removedCount);
  };
}

export const commentService = new CommentService();
