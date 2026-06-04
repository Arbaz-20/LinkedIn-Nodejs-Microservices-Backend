import { Request, Response } from 'express';
import { ok, created, noContent } from '@linkedin-clone/shared';
import { postService } from '../services/post.service';
import { feedService } from '../services/feed.service';

class PostController {
  public feed = async (req: Request, res: Response): Promise<void> => {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const page = await feedService.getFeed(req.userId!, cursor, limit);
    ok(res, page.posts, 200, { nextCursor: page.nextCursor, hasMore: page.hasMore });
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    ok(res, await postService.getById(req.params.id, req.userId!));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    created(res, await postService.create(req.userId!, req.body));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    ok(res, await postService.update(req.params.id, req.userId!, req.body));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    await postService.remove(req.params.id, req.userId!);
    noContent(res);
  };
}

export const postController = new PostController();
