import { Op, WhereOptions } from 'sequelize';
import { Post, Hashtag } from '../models';

class PostRepository {
  public findById = (id: string): Promise<Post | null> => {
    return Post.findOne({ where: { id, deletedAt: null } });
  };

  public findByIdWithHashtags = (id: string): Promise<Post | null> => {
    return Post.findOne({
      where: { id, deletedAt: null },
      include: [{ model: Hashtag, as: 'hashtags', through: { attributes: [] } }],
    });
  };

  public create = (data: {
    authorId: string;
    content: string;
    mediaUrls?: string[];
    postType?: Post['postType'];
    visibility?: Post['visibility'];
  }): Promise<Post> => {
    return Post.create({
      authorId: data.authorId,
      content: data.content,
      mediaUrls: data.mediaUrls ?? [],
      postType: data.postType,
      visibility: data.visibility,
    });
  };

  public update = (post: Post, changes: Partial<Post>): Promise<Post> => {
    return post.update(changes);
  };

  /**
   * Feed page: posts authored by `authorIds`, respecting visibility, newer-than
   * cursor, ordered by recency. Fetches limit+1 for cursor calculation.
   */
  public feedPage = (params: {
    authorIds: string[];
    connectionIds: string[];
    viewerId: string;
    cursor?: string;
    limit: number;
  }): Promise<Post[]> => {
    const { authorIds, connectionIds, viewerId, cursor, limit } = params;
    const where: WhereOptions = {
      authorId: { [Op.in]: authorIds },
      deletedAt: null,
      ...(cursor ? { createdAt: { [Op.lt]: new Date(cursor) } } : {}),
      [Op.or]: [
        { visibility: 'PUBLIC' },
        { visibility: 'CONNECTIONS', authorId: { [Op.in]: [...connectionIds, viewerId] } },
        { authorId: viewerId },
      ],
    };
    return Post.findAll({ where, order: [['createdAt', 'DESC']], limit: limit + 1 });
  };

  /** Posts carrying a given hashtag id (public only), newest first. */
  public listByHashtag = (hashtagId: string, limit: number, cursor?: string): Promise<Post[]> => {
    return Post.findAll({
      where: {
        deletedAt: null,
        visibility: 'PUBLIC',
        ...(cursor ? { createdAt: { [Op.lt]: new Date(cursor) } } : {}),
      },
      include: [{ model: Hashtag, as: 'hashtags', where: { id: hashtagId }, through: { attributes: [] }, required: true }],
      order: [['createdAt', 'DESC']],
      limit: limit + 1,
    });
  };

  public incrementCounter = async (
    id: string,
    field: 'likesCount' | 'commentsCount' | 'sharesCount',
    by: number,
  ): Promise<void> => {
    await Post.increment(field, { by, where: { id } });
  };
}

export const postRepository = new PostRepository();
