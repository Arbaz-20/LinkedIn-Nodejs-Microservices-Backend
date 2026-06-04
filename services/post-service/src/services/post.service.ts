import {
  ForbiddenError,
  NotFoundError,
  createLogger,
} from '@linkedin-clone/shared';
import { config } from '../config';
import { Post } from '../models';
import { postRepository } from '../repositories/post.repository';
import { postAccessService } from './postAccess.service';
import { hashtagService } from './hashtag.service';
import { postEventPublisher } from '../events/publishers';
import type { CreatePostInput, UpdatePostInput } from '../validators/post.validators';

const logger = createLogger(config.SERVICE_NAME);

class PostService {
  private getOrThrow = async (id: string): Promise<Post> => {
    const post = await postRepository.findById(id);
    if (!post) throw new NotFoundError('Post not found');
    return post;
  };

  public getById = async (id: string, viewerId: string): Promise<Post> => {
    const post = await postRepository.findByIdWithHashtags(id);
    if (!post) throw new NotFoundError('Post not found');
    await postAccessService.assertCanView(post, viewerId);
    return post;
  };

  public create = async (authorId: string, input: CreatePostInput): Promise<Post> => {
    const post = await postRepository.create({
      authorId,
      content: input.content,
      mediaUrls: input.mediaUrls,
      postType: input.postType,
      visibility: input.visibility,
    });
    const hashtags = await hashtagService.syncForPost(post.id, post.content);
    await postEventPublisher.publishCreated({
      postId: post.id,
      authorId,
      content: post.content,
      hashtags,
    });
    logger.info({ postId: post.id }, 'post created');
    return post;
  };

  public update = async (id: string, authorId: string, input: UpdatePostInput): Promise<Post> => {
    const post = await this.getOrThrow(id);
    if (post.authorId !== authorId) throw new ForbiddenError('Not your post');

    const updated = await postRepository.update(post, {
      content: input.content,
      mediaUrls: input.mediaUrls ?? post.mediaUrls,
      visibility: input.visibility ?? post.visibility,
      isEdited: true,
    });
    await hashtagService.syncForPost(updated.id, updated.content);
    return updated;
  };

  /** Soft-delete a post (author only). */
  public remove = async (id: string, authorId: string): Promise<void> => {
    const post = await this.getOrThrow(id);
    if (post.authorId !== authorId) throw new ForbiddenError('Not your post');
    await postRepository.update(post, { deletedAt: new Date() });
    await postEventPublisher.publishDeleted({ postId: id, authorId });
    logger.info({ postId: id }, 'post soft-deleted');
  };
}

export const postService = new PostService();
