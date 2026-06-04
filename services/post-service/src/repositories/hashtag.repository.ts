import { fn, col, literal } from 'sequelize';
import { Hashtag, PostHashtag } from '../models';

export interface TrendingHashtag {
  id: string;
  name: string;
  postCount: number;
}

class HashtagRepository {
  public findByName = (name: string): Promise<Hashtag | null> => {
    return Hashtag.findOne({ where: { name } });
  };

  public findOrCreateByName = async (name: string): Promise<Hashtag> => {
    const [tag] = await Hashtag.findOrCreate({ where: { name }, defaults: { name } });
    return tag;
  };

  /** Link a post to a set of hashtag ids (idempotent). */
  public linkPost = async (postId: string, hashtagIds: string[]): Promise<void> => {
    if (hashtagIds.length === 0) return;
    await PostHashtag.bulkCreate(
      hashtagIds.map((hashtagId) => ({ postId, hashtagId })),
      { ignoreDuplicates: true },
    );
  };

  public unlinkAll = async (postId: string): Promise<void> => {
    await PostHashtag.destroy({ where: { postId } });
  };

  /** Hashtags ordered by how many posts currently reference them. */
  public trending = async (limit: number): Promise<TrendingHashtag[]> => {
    const rows = await PostHashtag.findAll({
      attributes: ['hashtagId', [fn('COUNT', col('post_id')), 'postCount']],
      group: ['hashtagId'],
      order: [[literal('"postCount"'), 'DESC']],
      limit,
    });

    const counts = new Map(rows.map((r) => [r.hashtagId, Number((r.get('postCount') as string) ?? 0)]));
    if (counts.size === 0) return [];

    const tags = await Hashtag.findAll({ where: { id: [...counts.keys()] } });
    return tags
      .map((t) => ({ id: t.id, name: t.name, postCount: counts.get(t.id) ?? 0 }))
      .sort((a, b) => b.postCount - a.postCount);
  };
}

export const hashtagRepository = new HashtagRepository();
