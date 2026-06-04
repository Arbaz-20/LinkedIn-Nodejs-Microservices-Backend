import { BadRequestError, ForbiddenError } from '@linkedin-clone/shared';
import { Follow } from '../models';
import { followRepository } from '../repositories/follow.repository';
import { blockRepository } from '../repositories/block.repository';

class FollowService {
  public follow = async (followerId: string, followingId: string): Promise<Follow> => {
    if (followerId === followingId) throw new BadRequestError('You cannot follow yourself');
    if (await blockRepository.existsBetween(followerId, followingId)) {
      throw new ForbiddenError('Follow not allowed');
    }
    return followRepository.create(followerId, followingId);
  };

  public unfollow = async (followerId: string, followingId: string): Promise<void> => {
    await followRepository.delete(followerId, followingId);
  };

  public followers = (userId: string): Promise<Follow[]> => {
    return followRepository.listFollowers(userId);
  };

  public following = (userId: string): Promise<Follow[]> => {
    return followRepository.listFollowing(userId);
  };
}

export const followService = new FollowService();
