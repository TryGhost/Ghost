/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/routing/controllers/collection.js @ 407e032dc7 —
// transforms: CJS → ESM; Express req/res/next → ports + result union
// (`next(err)` → `handleError(err)`, which maps NotFound/Validation to
// `{next: true}`); `security.string.safe` → @tryghost/string slugify (safe()'s
// whole body, options.importing never passed here); `routerManager.ownsResource`
// → the seam urlService (router-manager.js delegates there verbatim);
// `themeEngine.getActive()` → `getRendererDeps().activeTheme`;
// @tryghost/debug → dropped.
import _ from '../../utils/lodash.ts';
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';
import { slugify } from '@tryghost/string';
import { getRendererDeps } from '../../seam/deps.ts';
import { urlService } from '../../seam/proxy.ts';
import renderEntries from '../../rendering/render-entries.ts';
import handleError from '../../rendering/error.ts';
import fetchData from '../../data/fetch-data.ts';
import type { PortRequest, PortResponse, RenderResult } from '../../ports.ts';

const messages = {
  pageNotFound: 'Page not found.',
};

/**
 * @description Collection controller.
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise}
 */
export default function collectionController(
  req: PortRequest,
  res: PortResponse,
): Promise<RenderResult> {
  const pathOptions: any = {
    page: req.params.page !== undefined ? req.params.page : 1,
    slug: req.params.slug ? slugify(req.params.slug) : undefined,
  };

  if (pathOptions.page) {
    // CASE 1: routes.yaml `limit` is stronger than theme definition
    // CASE 2: use `posts_per_page` config from theme as `limit` value
    if (res.routerOptions.limit) {
      getRendererDeps().activeTheme?.updateTemplateOptions?.({
        data: {
          config: {
            posts_per_page: res.routerOptions.limit,
          },
        },
      });

      pathOptions.limit = res.routerOptions.limit;
    } else {
      const postsPerPage = parseInt(getRendererDeps().activeTheme?.config('posts_per_page'));

      if (!isNaN(postsPerPage) && postsPerPage > 0) {
        pathOptions.limit = postsPerPage;
      }
    }
  }

  return fetchData(pathOptions, res.routerOptions, res.locals)
    .then(function handleResult(result: any): RenderResult {
      // CASE: requested page is greater than number of pages we have
      if (pathOptions.page > result.meta.pagination.pages) {
        return handleError(
          new errors.NotFoundError({
            message: tpl(messages.pageNotFound),
          }),
        );
      }

      /**
       * CASE:
       *
       * Does this post belong to this collection?
       * A post can only live in one collection. If you make use of multiple collections and you mis-use your routes.yaml,
       * it can happen that your database query will load the same posts, but we cannot show a post on two
       * different urls. This helper is only a prevention, but it's not a solution for the user, because
       * it will break pagination (e.g. you load 10 posts from database, but you only render 9).
       *
       * People should always invert their filters to ensure that the database query loads unique posts per collection.
       */
      result.posts = _.filter(result.posts, (post: any) => {
        // Restore the routing columns the Content API serializer strips:
        // `type` (the collection router knows what it serves) and
        // `status` (collections only ever load published posts). The
        // lazy URL service evaluates the base filter
        // `status:published+type:post` against these to decide ownership,
        // so without them an owned post is wrongly disowned and dropped.
        const resource = { ...post, type: res.routerOptions.resourceType, status: 'published' };
        if (urlService.ownsResource(res.routerOptions.identifier!, resource)) {
          return post;
        }

        return undefined;
      });

      return renderEntries(req, res)(result);
    })
    .catch(handleError);
}
