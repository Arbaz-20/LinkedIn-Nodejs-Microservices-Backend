import { Request, Response } from 'express';
import { ok, created, noContent } from '@linkedin-clone/shared';
import { skillService } from '../services/skill.service';

class SkillController {
  public list = async (req: Request, res: Response): Promise<void> => {
    ok(res, await skillService.list(req.userId!));
  };

  public add = async (req: Request, res: Response): Promise<void> => {
    created(res, await skillService.add(req.userId!, req.body));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    await skillService.remove(req.userId!, req.params.skillId);
    noContent(res);
  };

  /** Endorse another user's skill: POST /:profileId/skills/:skillId/endorse */
  public endorse = async (req: Request, res: Response): Promise<void> => {
    const endorsements = await skillService.endorse(
      req.userId!,
      req.params.profileId,
      req.params.skillId,
    );
    ok(res, { skillId: req.params.skillId, endorsements });
  };
}

export const skillController = new SkillController();
