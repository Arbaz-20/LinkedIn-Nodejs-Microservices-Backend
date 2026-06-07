import { Request, Response } from 'express';
import { ok, created, noContent, parseOffsetPagination, buildOffsetMeta } from '@linkedin-clone/shared';
import { jobService } from '../services/job.service';
import type { JobListFilters } from '../repositories/job.repository';

class JobController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const params = parseOffsetPagination(req.query);
    const filters: JobListFilters = {
      q: req.query.q as string | undefined,
      location: req.query.location as string | undefined,
      employmentType: req.query.employmentType as JobListFilters['employmentType'],
      experienceLevel: req.query.experienceLevel as JobListFilters['experienceLevel'],
      locationType: req.query.locationType as JobListFilters['locationType'],
      companyId: req.query.companyId as string | undefined,
    };
    const { rows, count } = await jobService.list(filters, params);
    ok(res, rows, 200, { ...buildOffsetMeta(count, params) });
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    ok(res, await jobService.getByIdWithCompany(req.params.id));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    created(res, await jobService.create(req.userId!, req.body));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    ok(res, await jobService.update(req.params.id, req.userId!, req.userRole!, req.body));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    await jobService.close(req.params.id, req.userId!, req.userRole!);
    noContent(res);
  };
}

export const jobController = new JobController();
