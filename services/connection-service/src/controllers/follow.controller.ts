import { Request, Response } from 'express';
import { ok, created, noContent } from '@linkedin-clone/shared';
import { followService } from '../services/follow.service';

class FollowController {
  public follow = async (req: Request, res: Response): Promise<void> => {
    created(res, await followService.follow(req.userId!, req.params.userId));
  };

  public unfollow = async (req: Request, res: Response): Promise<void> => {
    await followService.unfollow(req.userId!, req.params.userId);
    noContent(res);
  };

  public followers = async (req: Request, res: Response): Promise<void> => {
    ok(res, await followService.followers(req.userId!));
  };

  public following = async (req: Request, res: Response): Promise<void> => {
    ok(res, await followService.following(req.userId!));
  };
}

export const followController = new FollowController();
