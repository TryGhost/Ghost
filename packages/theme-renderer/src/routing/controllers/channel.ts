/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/routing/controllers/channel.js @ 407e032dc7 —
// transforms: CJS → ESM; Express req/res/next → ports + result union
// (`next(err)` → `handleError(err)`, which maps NotFound/Validation to
// `{next: true}`); `security.string.safe` → @tryghost/string slugify (safe()'s
// whole body, options.importing never passed here — same substitution as
// collection.ts); `themeEngine.getActive()` → `getRendererDeps().activeTheme`;
// @tryghost/debug → dropped.
import tpl from '@tryghost/tpl';
import errors from '@tryghost/errors';
import {slugify} from '@tryghost/string';
import {getRendererDeps} from '../../seam/deps.ts';
import renderEntries from '../../rendering/render-entries.ts';
import handleError from '../../rendering/error.ts';
import fetchData from '../../data/fetch-data.ts';
import type {PortRequest, PortResponse, RenderResult} from '../../ports.ts';

const messages = {
    pageNotFound: 'Page not found.'
};

/**
 * @description Channel controller.
 *
 * @TODO: The collection+rss controller do almost the same. Merge!
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise}
 */
export default function channelController(req: PortRequest, res: PortResponse): Promise<RenderResult> {
    const pathOptions: any = {
        page: req.params.page !== undefined ? req.params.page : 1,
        slug: req.params.slug ? slugify(req.params.slug) : undefined
    };

    if (pathOptions.page) {
        // CASE 1: routes.yaml `limit` is stronger than theme definition
        // CASE 2: use `posts_per_page` config from theme as `limit` value
        if (res.routerOptions.limit) {
            getRendererDeps().activeTheme?.updateTemplateOptions?.({
                data: {
                    config: {
                        posts_per_page: res.routerOptions.limit
                    }
                }
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
                return handleError(new errors.NotFoundError({
                    message: tpl(messages.pageNotFound)
                }));
            }

            return renderEntries(req, res)(result);
        })
        .catch(handleError);
}
