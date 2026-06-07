import { Request, Response } from 'express';
import { ok } from '@linkedin-clone/shared';
import { preferenceService } from '../services/preference.service';

class PreferenceController {
  public get = async (req: Request, res: Response): Promise<void> => {
    ok(res, await preferenceService.getOrCreate(req.userId!));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    ok(res, await preferenceService.update(req.userId!, req.body));
  };
}

export const preferenceController = new PreferenceController();
