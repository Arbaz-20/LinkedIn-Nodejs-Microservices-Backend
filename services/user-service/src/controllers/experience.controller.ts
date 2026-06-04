import { Request, Response } from 'express';
import { ok, created, noContent } from '@linkedin-clone/shared';
import { experienceService } from '../services/experience.service';

class ExperienceController {
  public list = async (req: Request, res: Response): Promise<void> => {
    ok(res, await experienceService.list(req.userId!));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    created(res, await experienceService.create(req.userId!, req.body));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    ok(res, await experienceService.update(req.params.id, req.userId!, req.body));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    await experienceService.remove(req.params.id, req.userId!);
    noContent(res);
  };
}

export const experienceController = new ExperienceController();
