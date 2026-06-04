import { Request, Response } from 'express';
import { ok, created, noContent } from '@linkedin-clone/shared';
import { certificationService } from '../services/certification.service';

class CertificationController {
  public list = async (req: Request, res: Response): Promise<void> => {
    ok(res, await certificationService.list(req.userId!));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    created(res, await certificationService.create(req.userId!, req.body));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    await certificationService.remove(req.params.id, req.userId!);
    noContent(res);
  };
}

export const certificationController = new CertificationController();
