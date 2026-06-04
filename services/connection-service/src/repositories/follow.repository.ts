import { Follow } from '../models';

class FollowRepository {
  public find = (followerId: string, followingId: string): Promise<Follow | null> => {
    return Follow.findOne({ where: { followerId, followingId } });
  };

  public create = async (followerId: string, followingId: string): Promise<Follow> => {
    const [row] = await Follow.findOrCreate({
      where: { followerId, followingId },
      defaults: { followerId, followingId },
    });
    return row;
  };

  public delete = (followerId: string, followingId: string): Promise<number> => {
    return Follow.destroy({ where: { followerId, followingId } });
  };

  /** Users who follow the given user. */
  public listFollowers = (userId: string): Promise<Follow[]> => {
    return Follow.findAll({ where: { followingId: userId }, order: [['createdAt', 'DESC']] });
  };

  /** Users the given user follows. */
  public listFollowing = (userId: string): Promise<Follow[]> => {
    return Follow.findAll({ where: { followerId: userId }, order: [['createdAt', 'DESC']] });
  };

  /** Bulk-remove every follow edge between two users (either direction). */
  public deleteBothDirections = async (a: string, b: string): Promise<void> => {
    await Follow.destroy({ where: { followerId: a, followingId: b } });
    await Follow.destroy({ where: { followerId: b, followingId: a } });
  };
}

export const followRepository = new FollowRepository();
