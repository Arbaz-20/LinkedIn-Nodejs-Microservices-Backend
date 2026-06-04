import { Request, Response } from 'express';
import { ok } from '@linkedin-clone/shared';
import { hashtagService } from '../services/hashtag.service';

class HashtagController {
  public trending = async (_req: Request, res: Response): Promise<void> => {
    ok(res, await hashtagService.trending());
  };

  public byName = async (req: Request, res: Response): Promise<void> => {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const page = await hashtagService.postsByHashtag(req.params.name, cursor, limit);
    ok(res, page.posts, 200, { nextCursor: page.nextCursor, hasMore: page.hasMore });
  };
}

export const hashtagController = new HashtagController();
