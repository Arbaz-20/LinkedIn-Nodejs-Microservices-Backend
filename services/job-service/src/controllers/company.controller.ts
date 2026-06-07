import { Request, Response } from 'express';
import { ok, created, parseOffsetPagination, buildOffsetMeta } from '@linkedin-clone/shared';
import { companyService } from '../services/company.service';

class CompanyController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const params = parseOffsetPagination(req.query);
    const { rows, count } = await companyService.list({ q: req.query.q as string | undefined }, params);
    ok(res, rows, 200, { ...buildOffsetMeta(count, params) });
  };

  public getBySlug = async (req: Request, res: Response): Promise<void> => {
    ok(res, await companyService.getBySlug(req.params.slug));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    created(res, await companyService.create(req.userId!, req.body));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    ok(res, await companyService.update(req.params.id, req.userId!, req.userRole!, req.body));
  };
}

export const companyController = new CompanyController();
