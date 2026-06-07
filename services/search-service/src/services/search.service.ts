import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { createLogger } from '@linkedin-clone/shared';
import { config } from '../config';
import { esClient, INDICES } from '../es/client';

const logger = createLogger(config.SERVICE_NAME);

export interface SearchResult<T = Record<string, unknown>> {
  items: T[];
  total: number;
}

const EMPTY: SearchResult = { items: [], total: 0 };

/** Read the numeric total from an ES `hits.total` (object or legacy number). */
function readTotal(total: number | SearchTotalHits | undefined): number {
  if (typeof total === 'number') return total;
  return total?.value ?? 0;
}

/**
 * Read-only full-text search over the indexed entities. Every method degrades
 * gracefully: if Elasticsearch is unreachable it logs a warning and returns an
 * empty result rather than throwing, so the API stays responsive.
 */
class SearchService {
  private search = async (
    index: string,
    fields: string[],
    q: string,
    page: number,
    limit: number,
  ): Promise<SearchResult> => {
    try {
      const res = await esClient.search({
        index,
        from: (page - 1) * limit,
        size: limit,
        query: { multi_match: { query: q, fields, fuzziness: 'AUTO' } },
      });
      return {
        items: res.hits.hits.map((h) => ({ id: h._id, ...(h._source as object) })),
        total: readTotal(res.hits.total),
      };
    } catch (err) {
      logger.warn({ err, index, q }, 'search failed — returning empty result');
      return EMPTY;
    }
  };

  public users = (q: string, page: number, limit: number): Promise<SearchResult> =>
    this.search(INDICES.USERS, ['firstName', 'lastName', 'headline', 'location', 'industry'], q, page, limit);

  public posts = (q: string, page: number, limit: number): Promise<SearchResult> =>
    this.search(INDICES.POSTS, ['content'], q, page, limit);

  public jobs = (q: string, page: number, limit: number): Promise<SearchResult> =>
    this.search(INDICES.JOBS, ['title', 'description', 'location', 'skills'], q, page, limit);

  public companies = (q: string, page: number, limit: number): Promise<SearchResult> =>
    this.search(INDICES.COMPANIES, ['name', 'industry', 'location'], q, page, limit);

  /**
   * Prefix-style suggestions sourced from users and companies. Returns a short
   * de-duplicated list of display strings.
   */
  public autocomplete = async (q: string, limit: number): Promise<string[]> => {
    try {
      const res = await esClient.search({
        index: [INDICES.USERS, INDICES.COMPANIES],
        size: limit,
        query: {
          multi_match: {
            query: q,
            type: 'phrase_prefix',
            fields: ['firstName', 'lastName', 'headline', 'name', 'industry'],
          },
        },
      });

      const suggestions = res.hits.hits.map((h) => {
        const src = h._source as Record<string, unknown>;
        if (src.name) return String(src.name);
        const name = [src.firstName, src.lastName].filter(Boolean).join(' ').trim();
        return name || String(src.headline ?? '');
      });

      return [...new Set(suggestions.filter(Boolean))].slice(0, limit);
    } catch (err) {
      logger.warn({ err, q }, 'autocomplete failed — returning empty result');
      return [];
    }
  };
}

export const searchService = new SearchService();
