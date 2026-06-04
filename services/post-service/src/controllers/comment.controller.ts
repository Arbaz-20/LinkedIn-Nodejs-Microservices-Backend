import { Request, Response } from 'express';
import { ok, created, noContent } from '@linkedin-clone/shared';
import { commentService } from '../services/comment.service';

class CommentController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const page = await commentService.list(req.params.id, req.userId!, cursor, limit);
    ok(res, page.comments, 200, { nextCursor: page.nextCursor, hasMore: page.hasMore });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    created(res, await commentService.create(req.params.id, req.userId!, req.body));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    ok(res, await commentService.update(req.params.commentId, req.userId!, req.body.content));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    await commentService.remove(req.params.commentId, req.userId!);
    noContent(res);
  };
}

export const commentController = new CommentController();
