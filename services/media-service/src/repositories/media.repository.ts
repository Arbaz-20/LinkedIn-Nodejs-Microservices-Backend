import { Media, MediaStatus } from '../models';

class MediaRepository {
  public findById = (id: string): Promise<Media | null> => {
    return Media.findByPk(id);
  };

  public create = (data: {
    uploaderId: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
    bucket: string;
    key: string;
    status?: MediaStatus;
    thumbnailUrl?: string | null;
    width?: number | null;
    height?: number | null;
  }): Promise<Media> => {
    return Media.create({
      uploaderId: data.uploaderId,
      fileName: data.fileName,
      mimeType: data.mimeType,
      size: data.size,
      url: data.url,
      bucket: data.bucket,
      key: data.key,
      status: data.status,
      thumbnailUrl: data.thumbnailUrl ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
    });
  };

  public update = (row: Media, changes: Partial<Media>): Promise<Media> => {
    return row.update(changes);
  };

  public delete = (id: string): Promise<number> => {
    return Media.destroy({ where: { id } });
  };
}

export const mediaRepository = new MediaRepository();
