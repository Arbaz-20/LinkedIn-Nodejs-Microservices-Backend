import { Request, Response } from 'express';
import { ok, created, noContent } from '@linkedin-clone/shared';
import { connectionService } from '../services/connection.service';
import type { ConnectionStatus } from '../models';

class ConnectionController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const status = req.query.status as ConnectionStatus | undefined;
    ok(res, await connectionService.list(req.userId!, status));
  };

  public pending = async (req: Request, res: Response): Promise<void> => {
    ok(res, await connectionService.listPendingIncoming(req.userId!));
  };

  public mutual = async (req: Request, res: Response): Promise<void> => {
    const userIds = await connectionService.mutual(req.userId!, req.params.userId);
    ok(res, { userIds, count: userIds.length });
  };

  public request = async (req: Request, res: Response): Promise<void> => {
    const conn = await connectionService.request(req.userId!, req.body.addresseeId, req.body.note);
    created(res, conn);
  };

  public accept = async (req: Request, res: Response): Promise<void> => {
    ok(res, await connectionService.accept(req.params.id, req.userId!));
  };

  public reject = async (req: Request, res: Response): Promise<void> => {
    ok(res, await connectionService.reject(req.params.id, req.userId!));
  };

  public withdraw = async (req: Request, res: Response): Promise<void> => {
    await connectionService.withdraw(req.params.id, req.userId!);
    noContent(res);
  };
}

export const connectionController = new ConnectionController();
