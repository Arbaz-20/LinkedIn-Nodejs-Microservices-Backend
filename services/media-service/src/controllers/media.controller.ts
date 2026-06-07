import { Request, Response } from 'express';
import { ok, created, noContent } from '@linkedin-clone/shared';
import { mediaService } from '../services/media.service';

class MediaController {
  public upload = async (req: Request, res: Response): Promise<void> => {
    const media = await mediaService.upload(req.userId!, req.file);
    created(res, media);
  };

  public presigned = async (req: Request, res: Response): Promise<void> => {
    const { uploadUrl, key, publicUrl, media } = await mediaService.createPresigned(
      req.userId!,
      req.body.fileName,
      req.body.mimeType,
    );
    created(res, { uploadUrl, key, publicUrl, media });
  };

  public get = async (req: Request, res: Response): Promise<void> => {
    ok(res, await mediaService.get(req.params.id));
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    await mediaService.delete(req.params.id, req.userId!);
    noContent(res);
  };
}

export const mediaController = new MediaController();
