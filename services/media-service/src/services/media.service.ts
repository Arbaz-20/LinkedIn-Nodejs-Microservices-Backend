import { v4 as uuid } from 'uuid';
import { BadRequestError, ForbiddenError, NotFoundError, createLogger } from '@linkedin-clone/shared';
import { config } from '../config';
import { Media } from '../models';
import { mediaRepository } from '../repositories/media.repository';
import { storage } from '../storage/minio';
import { mediaEventPublisher } from '../events/publishers';

const logger = createLogger(config.SERVICE_NAME);

interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

class MediaService {
  private getOrThrow = async (id: string): Promise<Media> => {
    const row = await mediaRepository.findById(id);
    if (!row) throw new NotFoundError('Media not found');
    return row;
  };

  private buildKey = (userId: string, originalName: string): string => {
    return `${userId}/${uuid()}-${originalName}`;
  };

  /** Direct multipart upload — stores the buffer in MinIO and records metadata. */
  public upload = async (uploaderId: string, file?: UploadFile): Promise<Media> => {
    if (!file) throw new BadRequestError('No file provided');

    const key = this.buildKey(uploaderId, file.originalname);
    await storage.putObject(key, file.buffer, file.size, file.mimetype);

    const media = await mediaRepository.create({
      uploaderId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: storage.publicUrl(key),
      bucket: config.MINIO_BUCKET,
      key,
      status: 'READY',
    });

    if (file.mimetype.startsWith('image/')) {
      try {
        await mediaEventPublisher.publishResize({
          mediaId: media.id,
          key,
          bucket: config.MINIO_BUCKET,
        });
        await mediaEventPublisher.publishThumbnail({
          mediaId: media.id,
          key,
          bucket: config.MINIO_BUCKET,
        });
      } catch (err) {
        logger.warn({ err, mediaId: media.id }, 'failed to publish media processing event');
      }
    }

    logger.info({ mediaId: media.id }, 'media uploaded');
    return media;
  };

  /** Issue a presigned PUT URL and pre-register a PROCESSING metadata row. */
  public createPresigned = async (
    uploaderId: string,
    fileName: string,
    mimeType: string,
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string; media: Media }> => {
    const key = this.buildKey(uploaderId, fileName);
    const uploadUrl = await storage.presignedPutUrl(key, 300);
    const publicUrl = storage.publicUrl(key);

    const media = await mediaRepository.create({
      uploaderId,
      fileName,
      mimeType,
      size: 0,
      url: publicUrl,
      bucket: config.MINIO_BUCKET,
      key,
      status: 'PROCESSING',
    });

    return { uploadUrl, key, publicUrl, media };
  };

  public get = (id: string): Promise<Media> => {
    return this.getOrThrow(id);
  };

  /** Delete media — only the uploader may delete. Object removal is best-effort. */
  public delete = async (id: string, userId: string): Promise<void> => {
    const row = await this.getOrThrow(id);
    if (row.uploaderId !== userId) throw new ForbiddenError('Only the uploader can delete this media');

    try {
      await storage.removeObject(row.key);
    } catch (err) {
      logger.warn({ err, mediaId: id }, 'failed to remove object from storage');
    }

    await mediaRepository.delete(id);
    logger.info({ mediaId: id }, 'media deleted');
  };
}

export const mediaService = new MediaService();
