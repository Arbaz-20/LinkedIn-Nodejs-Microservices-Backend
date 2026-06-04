import { NotFoundError } from '@linkedin-clone/shared';
import { config } from '../config';
import { Post } from '../models';
import { hashtagRepository, TrendingHashtag } from '../repositories/hashtag.repository';
import { postRepository } from '../repositories/post.repository';
import { buildCursorPage } from '@linkedin-clone/shared';

/** Matches "#word" tokens (letters, digits, underscore), case-insensitive. */
const HASHTAG_RE = /#(\w{1,100})/g;

class HashtagService {
  /** Extract unique, lower-cased hashtag names from post content. */
  public extract = (content: string): string[] => {
    const found = new Set<string>();
    for (const match of content.matchAll(HASHTAG_RE)) {
      found.add(match[1].toLowerCase());
    }
    return [...found];
  };

  /** Resolve names to hashtag rows (creating missing ones) and link to a post. */
  public syncForPost = async (postId: string, content: string): Promise<string[]> => {
    const names = this.extract(content);
    await hashtagRepository.unlinkAll(postId);
    if (names.length === 0) return [];
    const tags = await Promise.all(names.map((n) => hashtagRepository.findOrCreateByName(n)));
    await hashtagRepository.linkPost(postId, tags.map((t) => t.id));
    return names;
  };

  public trending = (limit = 10): Promise<TrendingHashtag[]> => {
    return hashtagRepository.trending(limit);
  };

  public postsByHashtag = async (
    name: string,
    cursor?: string,
    limit = config.FEED_PAGE_SIZE,
  ): Promise<{ posts: Post[]; nextCursor: string | null; hasMore: boolean }> => {
    const tag = await hashtagRepository.findByName(name.toLowerCase());
    if (!tag) throw new NotFoundError('Hashtag not found');
    const rows = await postRepository.listByHashtag(tag.id, limit, cursor);
    const { items, nextCursor, hasMore } = buildCursorPage(rows, limit, (p) => p.createdAt.toISOString());
    return { posts: items, nextCursor, hasMore };
  };
}

export const hashtagService = new HashtagService();
