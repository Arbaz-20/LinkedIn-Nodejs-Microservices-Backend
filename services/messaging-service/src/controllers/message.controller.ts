import { Request, Response } from 'express';
import { ok, created, noContent, parseCursorPagination } from '@linkedin-clone/shared';
import { messageService } from '../services/message.service';

class MessageController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const { limit, cursor } = parseCursorPagination(req.query, { limit: 20, maxLimit: 50 });
    const page = await messageService.list(req.params.id, req.userId!, cursor, limit);
    ok(res, page.messages, 200, { nextCursor: page.nextCursor, hasMore: page.hasMore });
  };

  public send = async (req: Request, res: Response): Promise<void> => {
    created(res, await messageService.send(req.params.id, req.userId!, req.body));
  };

  public edit = async (req: Request, res: Response): Promise<void> => {
    ok(res, await messageService.edit(req.params.id, req.params.msgId, req.userId!, req.body.content));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    await messageService.remove(req.params.id, req.params.msgId, req.userId!);
    noContent(res);
  };
}

export const messageController = new MessageController();
