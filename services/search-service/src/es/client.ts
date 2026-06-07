import { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { createLogger } from '@linkedin-clone/shared';
import { config } from '../config';

const logger = createLogger(config.SERVICE_NAME);

/** Canonical Elasticsearch index names owned by this service. */
export const INDICES = {
  USERS: 'users',
  POSTS: 'posts',
  JOBS: 'jobs',
  COMPANIES: 'companies',
} as const;

/** Singleton Elasticsearch client. */
export const esClient = new Client({ node: config.ELASTICSEARCH_URL });

/** Text field with a `keyword` sub-field for exact-match / sorting / id usage. */
const text = { type: 'text' as const, fields: { keyword: { type: 'keyword' as const } } };

const MAPPINGS: Record<string, MappingTypeMapping> = {
  [INDICES.USERS]: {
    properties: {
      userId: { type: 'keyword' },
      email: text,
      firstName: text,
      lastName: text,
      headline: text,
      avatarUrl: { type: 'keyword' },
      location: text,
      industry: text,
    },
  },
  [INDICES.POSTS]: {
    properties: {
      postId: { type: 'keyword' },
      authorId: { type: 'keyword' },
      content: { type: 'text' },
      createdAt: { type: 'date' },
    },
  },
  [INDICES.JOBS]: {
    properties: {
      jobId: { type: 'keyword' },
      companyId: { type: 'keyword' },
      title: text,
      description: { type: 'text' },
      location: text,
      skills: text,
    },
  },
  [INDICES.COMPANIES]: {
    properties: {
      companyId: { type: 'keyword' },
      name: text,
      industry: text,
      location: text,
    },
  },
};

/**
 * Idempotently create every index this service relies on. Safe to call on every
 * boot — existing indices are left untouched.
 */
export async function ensureIndices(): Promise<void> {
  for (const index of Object.values(INDICES)) {
    const exists = await esClient.indices.exists({ index });
    if (exists) {
      logger.info({ index }, 'index already exists');
      continue;
    }
    await esClient.indices.create({ index, mappings: MAPPINGS[index] });
    logger.info({ index }, 'index created');
  }
}
