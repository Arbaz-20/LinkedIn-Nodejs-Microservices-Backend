import { BadRequestError } from '@linkedin-clone/shared';
import { Block } from '../models';
import { blockRepository } from '../repositories/block.repository';
import { followRepository } from '../repositories/follow.repository';
import { connectionRepository } from '../repositories/connection.repository';

class BlockService {
  /**
   * Block a user. Blocking is destructive to existing edges: any follows (both
   * directions) and any connection between the two are torn down.
   */
  public block = async (blockerId: string, blockedId: string): Promise<Block> => {
    if (blockerId === blockedId) throw new BadRequestError('You cannot block yourself');

    const row = await blockRepository.create(blockerId, blockedId);
    await followRepository.deleteBothDirections(blockerId, blockedId);

    const connection = await connectionRepository.findBetween(blockerId, blockedId);
    if (connection) await connectionRepository.delete(connection.id);

    return row;
  };

  public unblock = async (blockerId: string, blockedId: string): Promise<void> => {
    await blockRepository.delete(blockerId, blockedId);
  };
}

export const blockService = new BlockService();
