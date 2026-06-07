import { Request, Response } from 'express';
import { ok, created, noContent } from '@linkedin-clone/shared';
import { conversationService } from '../services/conversation.service';

class ConversationController {
  public list = async (req: Request, res: Response): Promise<void> => {
    ok(res, await conversationService.list(req.userId!));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    created(res, await conversationService.create(req.userId!, req.body));
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    ok(res, await conversationService.getById(req.params.id, req.userId!));
  };

  public markRead = async (req: Request, res: Response): Promise<void> => {
    await conversationService.markRead(req.params.id, req.userId!);
    noContent(res);
  };
}

export const conversationController = new ConversationController();
