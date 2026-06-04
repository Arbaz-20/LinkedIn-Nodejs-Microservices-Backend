import { Request, Response } from 'express';
import { ok, noContent } from '@linkedin-clone/shared';
import { reactionService } from '../services/reaction.service';

class ReactionController {
  public react = async (req: Request, res: Response): Promise<void> => {
    const reaction = await reactionService.react(req.params.id, req.userId!, req.body.type);
    ok(res, reaction);
  };

  public unreact = async (req: Request, res: Response): Promise<void> => {
    await reactionService.unreact(req.params.id, req.userId!);
    noContent(res);
  };
}

export const reactionController = new ReactionController();
