import { Request, Response } from 'express';
import { ok, parseOffsetPagination, buildOffsetMeta } from '@linkedin-clone/shared';
import { searchService } from '../services/search.service';

class SearchController {
  public users = async (req: Request, res: Response): Promise<void> => {
    const params = parseOffsetPagination(req.query);
    const q = String(req.query.q);
    const { items, total } = await searchService.users(q, params.page, params.limit);
    ok(res, items, 200, buildOffsetMeta(total, params));
  };

  public posts = async (req: Request, res: Response): Promise<void> => {
    const params = parseOffsetPagination(req.query);
    const q = String(req.query.q);
    const { items, total } = await searchService.posts(q, params.page, params.limit);
    ok(res, items, 200, buildOffsetMeta(total, params));
  };

  public jobs = async (req: Request, res: Response): Promise<void> => {
    const params = parseOffsetPagination(req.query);
    const q = String(req.query.q);
    const { items, total } = await searchService.jobs(q, params.page, params.limit);
    ok(res, items, 200, buildOffsetMeta(total, params));
  };

  public companies = async (req: Request, res: Response): Promise<void> => {
    const params = parseOffsetPagination(req.query);
    const q = String(req.query.q);
    const { items, total } = await searchService.companies(q, params.page, params.limit);
    ok(res, items, 200, buildOffsetMeta(total, params));
  };

  public autocomplete = async (req: Request, res: Response): Promise<void> => {
    const q = String(req.query.q);
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const suggestions = await searchService.autocomplete(q, limit);
    ok(res, suggestions);
  };
}

export const searchController = new SearchController();
