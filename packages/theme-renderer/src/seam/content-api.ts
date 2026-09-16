/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HTTP Content API binding over web-standard fetch.
 *
 * Implements the in-process API controller shape the frontend render path
 * uses (`api[controller][type](options)` — see
 * ghost/core/core/frontend/services/data/fetch-data.js and entry-lookup.js)
 * by translating each call into a Content API HTTP request:
 *
 *   api.postsPublic.browse({filter, limit, order, page, include})
 *     → GET {siteUrl}/ghost/api/content/posts/?key=...&filter=...
 *   api.postsPublic.read({slug, include})
 *     → GET {siteUrl}/ghost/api/content/posts/slug/{slug}/?key=...
 *   api.postsPublic.read({id, include})
 *     → GET {siteUrl}/ghost/api/content/posts/{id}/?key=...
 *
 * In-process-only options are stripped before the request:
 * - `context` ({member, giftToken}) — anonymous-only rendering per spec scope
 * - `skipPagination` (prev_post/next_post) — an in-process query option the
 *   HTTP API rejects as unknown
 * The response body is returned as-is: the Content API attaches `url` to every
 * resource, which the url helper/urlService seam relies on.
 */
import errors from '@tryghost/errors';
import type { ApiBrowseOptions, ApiController, ContentApiPort } from './types.ts';

export interface CreateContentApiOptions {
  /** Site URL the Content API lives under, e.g. http://localhost:2368/ */
  siteUrl: string;
  /** Content API key */
  key: string;
  /** fetch implementation — defaults to globalThis.fetch */
  fetch?: typeof globalThis.fetch;
}

// Options fetch-data / entry-lookup / the get helper pass that map 1:1 onto
// Content API query params. Everything else is dropped (in-process only).
const QUERY_PARAM_OPTIONS = [
  'include',
  'filter',
  'fields',
  'formats',
  'limit',
  'order',
  'page',
  'visibility',
];

const CONTROLLER_RESOURCES: Record<string, string> = {
  postsPublic: 'posts',
  pagesPublic: 'pages',
  tagsPublic: 'tags',
  authorsPublic: 'authors',
  tiersPublic: 'tiers',
  newslettersPublic: 'newsletters',
};

export function createContentApi(options: CreateContentApiOptions): ContentApiPort {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const baseUrl = options.siteUrl.replace(/\/$/, '') + '/ghost/api/content/';

  function buildUrl(resource: string, pathSuffix: string, apiOptions: ApiBrowseOptions): URL {
    const url = new URL(`${resource}/${pathSuffix}`, baseUrl);
    url.searchParams.set('key', options.key);
    for (const name of QUERY_PARAM_OPTIONS) {
      const value = apiOptions[name];
      if (value !== undefined && value !== null) {
        url.searchParams.set(name, String(value));
      }
    }
    return url;
  }

  async function request(url: URL): Promise<any> {
    const response = await fetchImpl(url.toString(), {
      headers: { accept: 'application/json' },
    });

    let body: any = null;
    try {
      body = await response.json();
    } catch {
      // fall through to the status check below with a null body
    }

    if (!response.ok) {
      const apiError = body?.errors?.[0];
      // Preserve the error TYPE across the HTTP boundary: the ported
      // rendering/error.ts dispatches on `errorType` ('NotFoundError' /
      // 'ValidationError' fall through to the next route candidate, so a
      // post-permalink miss can reach the static-pages lookup like the
      // in-process API allows).
      const errorType = apiError?.type ?? apiError?.errorType;
      const message =
        apiError?.message || `Content API request failed with status ${response.status}`;
      if (errorType === 'NotFoundError' || response.status === 404) {
        throw new errors.NotFoundError({
          message,
          statusCode: response.status,
          code: apiError?.code,
          context: apiError?.context,
        });
      }
      if (errorType === 'ValidationError' || response.status === 422) {
        throw new errors.ValidationError({
          message,
          statusCode: response.status,
          code: apiError?.code,
          context: apiError?.context,
        });
      }
      throw new errors.InternalServerError({
        message,
        statusCode: response.status,
        code: apiError?.code,
        context: apiError?.context,
      });
    }

    return body;
  }

  function createController(resource: string): ApiController {
    return {
      browse(apiOptions: ApiBrowseOptions = {}) {
        return request(buildUrl(resource, '', apiOptions));
      },
      read(apiOptions: ApiBrowseOptions = {}) {
        // In-process `.read({slug})` maps to HTTP `/{resource}/slug/{slug}/`,
        // `.read({id})` to `/{resource}/{id}/` (see entry-lookup.js:52 —
        // it always calls .read with slug|id picked from permalink params).
        let pathSuffix;
        if (apiOptions.id) {
          pathSuffix = `${encodeURIComponent(String(apiOptions.id))}/`;
        } else if (apiOptions.slug) {
          pathSuffix = `slug/${encodeURIComponent(String(apiOptions.slug))}/`;
        } else {
          throw new errors.IncorrectUsageError({
            message: `Content API read for "${resource}" requires a slug or id`,
          });
        }
        return request(buildUrl(resource, pathSuffix, apiOptions));
      },
    };
  }

  const api: ContentApiPort = {} as ContentApiPort;
  for (const controller of Object.keys(CONTROLLER_RESOURCES)) {
    api[controller] = createController(CONTROLLER_RESOURCES[controller] as string);
  }

  // {{total_members}} / {{total_paid_members}} use api.stats.memberCountHistory,
  // which has no Content API equivalent — stubbed to zero totals.
  // Documented delta in docs/provenance.md.
  api.stats = {
    memberCountHistory: {
      query() {
        return Promise.resolve({ meta: { totals: { free: 0, paid: 0, comped: 0, gift: 0 } } });
      },
    },
  };

  return api;
}
