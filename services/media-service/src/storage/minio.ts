import { Client } from 'minio';
import { config } from '../config';
import { createLogger } from '@linkedin-clone/shared';

const logger = createLogger(config.SERVICE_NAME);

/** Singleton MinIO (S3-compatible) client built from configuration. */
export const minioClient = new Client({
  endPoint: config.MINIO_ENDPOINT,
  port: config.MINIO_PORT,
  useSSL: config.MINIO_USE_SSL,
  accessKey: config.MINIO_ACCESS_KEY,
  secretKey: config.MINIO_SECRET_KEY,
});

/** Create the configured bucket if it does not already exist. */
export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(config.MINIO_BUCKET);
  if (!exists) {
    await minioClient.makeBucket(config.MINIO_BUCKET, '');
    logger.info(`MinIO bucket created: ${config.MINIO_BUCKET}`);
  } else {
    logger.info(`MinIO bucket ready: ${config.MINIO_BUCKET}`);
  }
}

class Storage {
  /** Upload a buffer to the configured bucket under the given key. */
  public putObject = (
    key: string,
    buffer: Buffer,
    size: number,
    mimeType: string,
  ): Promise<unknown> => {
    return minioClient.putObject(config.MINIO_BUCKET, key, buffer, size, {
      'Content-Type': mimeType,
    });
  };

  /** Remove an object from the configured bucket. */
  public removeObject = (key: string): Promise<void> => {
    return minioClient.removeObject(config.MINIO_BUCKET, key);
  };

  /** Generate a presigned PUT URL the client can upload to directly. */
  public presignedPutUrl = (key: string, expirySeconds: number): Promise<string> => {
    return minioClient.presignedPutObject(config.MINIO_BUCKET, key, expirySeconds);
  };

  /** Public URL for reading an object (assumes public-read or a fronting proxy). */
  public publicUrl = (key: string): string => {
    const base =
      config.MINIO_PUBLIC_URL ??
      `${config.MINIO_USE_SSL ? 'https' : 'http'}://${config.MINIO_ENDPOINT}:${config.MINIO_PORT}`;
    return `${base}/${config.MINIO_BUCKET}/${key}`;
  };
}

export const storage = new Storage();
