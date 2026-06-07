import { createLogger } from '@linkedin-clone/shared';
import { config } from '../config';
import { esClient, INDICES } from '../es/client';

const logger = createLogger(config.SERVICE_NAME);

/** Delete a document, swallowing a 404 when it was never indexed. */
async function removeDoc(index: string, id: string): Promise<void> {
  try {
    await esClient.delete({ index, id });
  } catch (err) {
    const status = (err as { meta?: { statusCode?: number } }).meta?.statusCode;
    if (status === 404) {
      logger.warn({ index, id }, 'delete skipped — document not found');
      return;
    }
    throw err;
  }
}

/**
 * Writes documents into Elasticsearch in response to bus events. Errors propagate
 * so the consumer's retry/DLQ machinery can handle transient failures.
 */
class IndexingService {
  public indexUser = async <T extends { userId: string }>(doc: T): Promise<void> => {
    await esClient.index({
      index: INDICES.USERS,
      id: doc.userId,
      document: doc as Record<string, unknown>,
    });
    logger.info({ userId: doc.userId }, 'indexed user');
  };

  public removeUser = async (id: string): Promise<void> => {
    await removeDoc(INDICES.USERS, id);
    logger.info({ userId: id }, 'removed user');
  };

  public indexPost = async <T extends { postId: string }>(doc: T): Promise<void> => {
    await esClient.index({
      index: INDICES.POSTS,
      id: doc.postId,
      document: doc as Record<string, unknown>,
    });
    logger.info({ postId: doc.postId }, 'indexed post');
  };

  public removePost = async (id: string): Promise<void> => {
    await removeDoc(INDICES.POSTS, id);
    logger.info({ postId: id }, 'removed post');
  };

  public indexJob = async <T extends { jobId: string }>(doc: T): Promise<void> => {
    await esClient.index({
      index: INDICES.JOBS,
      id: doc.jobId,
      document: doc as Record<string, unknown>,
    });
    logger.info({ jobId: doc.jobId }, 'indexed job');
  };

  public removeJob = async (id: string): Promise<void> => {
    await removeDoc(INDICES.JOBS, id);
    logger.info({ jobId: id }, 'removed job');
  };

  public indexCompany = async <T extends { companyId: string }>(doc: T): Promise<void> => {
    await esClient.index({
      index: INDICES.COMPANIES,
      id: doc.companyId,
      document: doc as Record<string, unknown>,
    });
    logger.info({ companyId: doc.companyId }, 'indexed company');
  };
}

export const indexingService = new IndexingService();
