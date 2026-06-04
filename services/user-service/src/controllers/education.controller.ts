import { Request, Response } from 'express';
import { ok, created, noContent } from '@linkedin-clone/shared';
import { educationService } from '../services/education.service';

class EducationController {
  public list = async (req: Request, res: Response): Promise<void> => {
    ok(res, await educationService.list(req.userId!));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    created(res, await educationService.create(req.userId!, req.body));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    ok(res, await educationService.update(req.params.id, req.userId!, req.body));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    await educationService.remove(req.params.id, req.userId!);
    noContent(res);
  };
}

export const educationController = new EducationController();
