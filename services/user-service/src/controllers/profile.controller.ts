import { Request, Response } from 'express';
import { ok } from '@linkedin-clone/shared';
import { profileService } from '../services/profile.service';

class ProfileController {
  public getMe = async (req: Request, res: Response): Promise<void> => {
    const profile = await profileService.getOwn(req.userId!);
    ok(res, profile);
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const profile = await profileService.getPublic(req.params.id, req.userId);
    ok(res, profile);
  };

  public updateMe = async (req: Request, res: Response): Promise<void> => {
    const profile = await profileService.update(req.userId!, req.body);
    ok(res, profile);
  };

  public updateAvatar = async (req: Request, res: Response): Promise<void> => {
    const profile = await profileService.setAvatar(req.userId!, req.body.avatarUrl);
    ok(res, profile);
  };

  public updateBanner = async (req: Request, res: Response): Promise<void> => {
    const profile = await profileService.setBanner(req.userId!, req.body.bannerUrl);
    ok(res, profile);
  };
}

export const profileController = new ProfileController();
