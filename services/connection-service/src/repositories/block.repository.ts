import { Op } from 'sequelize';
import { Block } from '../models';

class BlockRepository {
  public create = async (blockerId: string, blockedId: string): Promise<Block> => {
    const [row] = await Block.findOrCreate({
      where: { blockerId, blockedId },
      defaults: { blockerId, blockedId },
    });
    return row;
  };

  public delete = (blockerId: string, blockedId: string): Promise<number> => {
    return Block.destroy({ where: { blockerId, blockedId } });
  };

  public find = (blockerId: string, blockedId: string): Promise<Block | null> => {
    return Block.findOne({ where: { blockerId, blockedId } });
  };

  /** True if either user has blocked the other. */
  public existsBetween = async (a: string, b: string): Promise<boolean> => {
    const row = await Block.findOne({
      where: {
        [Op.or]: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
    return row !== null;
  };
}

export const blockRepository = new BlockRepository();
