import { Request, Response } from 'express';
import { ok, created, noContent } from '@linkedin-clone/shared';
import { applicationService } from '../services/application.service';

class ApplicationController {
  public apply = async (req: Request, res: Response): Promise<void> => {
    created(res, await applicationService.apply(req.params.id, req.userId!, req.body));
  };

  public listForJob = async (req: Request, res: Response): Promise<void> => {
    ok(res, await applicationService.listForJob(req.params.id, req.userId!, req.userRole!));
  };

  public listMine = async (req: Request, res: Response): Promise<void> => {
    ok(res, await applicationService.listMine(req.userId!));
  };

  public updateStatus = async (req: Request, res: Response): Promise<void> => {
    ok(res, await applicationService.updateStatus(req.params.appId, req.userId!, req.userRole!, req.body.status));
  };

  // ─── Saved jobs ──────────────────────────────────────────
  public save = async (req: Request, res: Response): Promise<void> => {
    const { saved, created: wasCreated } = await applicationService.save(req.userId!, req.params.id);
    if (wasCreated) {
      created(res, saved);
      return;
    }
    ok(res, saved);
  };

  public unsave = async (req: Request, res: Response): Promise<void> => {
    await applicationService.unsave(req.userId!, req.params.id);
    noContent(res);
  };

  public listSaved = async (req: Request, res: Response): Promise<void> => {
    ok(res, await applicationService.listSaved(req.userId!));
  };
}

export const applicationController = new ApplicationController();
