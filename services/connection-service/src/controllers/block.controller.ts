import { Request, Response } from 'express';
import { created, noContent } from '@linkedin-clone/shared';
import { blockService } from '../services/block.service';

class BlockController {
  public block = async (req: Request, res: Response): Promise<void> => {
    created(res, await blockService.block(req.userId!, req.params.userId));
  };

  public unblock = async (req: Request, res: Response): Promise<void> => {
    await blockService.unblock(req.userId!, req.params.userId);
    noContent(res);
  };
}

export const blockController = new BlockController();
