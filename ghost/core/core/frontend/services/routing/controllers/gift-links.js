const debug = require('@tryghost/debug')('services:routing:controllers:gift-links');
const _ = require('lodash');
const labs = require('../../../../shared/labs');
const renderer = require('../../rendering');
const hbs = require('../../theme-engine/engine');
const giftLinksService = require('../../../../server/services/gift-links');

/**
 * Redirect to the post's canonical URL with `Cache-Control: no-store` so the
 * 301 isn't cached by Fastly or browsers (a reset link must not poison
 * subsequent requests via a stale browser-cached redirect). We don't use
 * `urlUtils.redirect301` here because it sets `Cache-Control: public,
 * max-age=...` which is the opposite of what gift-link redirects need.
 */
function redirectNoStore(res, url) {
    res.set('Cache-Control', 'no-store');
    res.redirect(301, url);
}

/**
 * Gift Link Controller — handles `/g/:slug/?key=TOKEN` requests.
 *
 * Flow:
 *   1. Validate `?key=TOKEN` against the active `gift_links` row.
 *   2. Fetch the gift link's post (or page — gift links serve both) via the
 *      public API. Stash `res.locals.giftLink` first so the API's `forPost`
 *      serializer grants content-only access (mirrors the canonical-URL flow).
 *   3. Verify the URL slug matches the post's slug (the token unlocks ONLY
 *      its own post — a token paired with the wrong slug is treated as
 *      invalid, never leaks the real slug).
 *   4. On match: count the read (bot-filtered, fire-and-forget) and render
 *      via the standard entry pipeline.
 *   5. On ANY failure (missing/empty/invalid key, slug mismatch, post not
 *      published): 301 to the URL slug's canonical post URL if it resolves,
 *      else 404 by falling through. The redirect omits the bad key and the
 *      `utm_campaign` so failure paths don't pollute gift counts/analytics.
 *
 * Cache headers (`no-store`) are set by [frontend-caching.js] via the `/g/`
 * path check, which covers both rendered responses AND the 301 redirects
 * emitted here. We additionally set `X-Robots-Tag: noindex` +
 * `Referrer-Policy: no-referrer` on rendered gift responses for defense in
 * depth (the canonical's `rel=canonical` already points away from `/g/`).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = async function giftLinksController(req, res, next) {
    debug('giftLinksController');

    if (!labs.isSet('giftLinks')) {
        return next();
    }

    const urlSlug = req.params.slug;
    const api = require('../../proxy').api;

    // `res.locals.giftLink` is set by the site-level loadGiftLink middleware
    // when a valid `?key=` token resolves to an active gift link. The slug-
    // match check happens here (the middleware doesn't know the URL slug
    // until routing dispatches), so an invalid/missing token simply means
    // `res.locals.giftLink` is unset and we go straight to the redirect path.
    const giftLink = res.locals.giftLink;

    try {
        if (giftLink) {
            // Fetch the gift's post via the public API by id. The
            // `include: 'authors,tags,tiers'` mirrors what entry-lookup
            // requests; without it, downstream helpers (meta schema, etc.)
            // crash on missing fields. Thread giftLink into the context so
            // the forPost serializer grants content-only access.
            const fetched = await readPostOrPage(api, {
                id: giftLink.post_id,
                include: 'authors,tags,tiers',
                context: {member: res.locals.member, giftLink}
            });

            // The public API already filters to published entries, so
            // `fetched` being non-null is sufficient. The serialized response
            // strips the `status` column — do not re-check it here.
            if (fetched && fetched.entry.slug === urlSlug) {
                res.routerOptions.context = fetched.resource === 'pages' ? ['page'] : ['post'];

                // `@gift` — documented template context for gift-link renders.
                // Set here, on the verified render path only (never on
                // redirects, fall-through 404s, or canonical routes), so theme
                // authors can rely on `{{#if @gift}}` meaning "THIS render is
                // the gift's own post via a valid link". Shape: `{post_id}`.
                // The token is deliberately NOT exposed to templates.
                const localTemplateOptions = hbs.getLocalTemplateOptions(res.locals);
                hbs.updateLocalTemplateOptions(res.locals, _.merge({}, localTemplateOptions, {
                    data: {gift: {post_id: giftLink.post_id}}
                }));

                giftLinksService.middleware.countGiftRead(req, res, giftLink);

                return renderer.renderEntry(req, res)(fetched.entry);
            }

            // Token resolved but the URL slug doesn't match the token's
            // post — treat as invalid. Clear the grant defensively so any
            // downstream res.locals reader sees no gift on the redirect/404
            // path (`@gift` is only ever set on the verified render above).
            res.locals.giftLink = null;
        }

        // Invalid / missing / mismatched → redirect to the URL slug's
        // canonical post URL (NOT the token's real post — that would leak
        // the real slug). If the URL slug isn't a published post/page, fall
        // through to 404.
        const fallback = await readPostOrPage(api, {slug: urlSlug});
        if (fallback && fallback.entry.url) {
            return redirectNoStore(res, fallback.entry.url);
        }
        return next();
    } catch (err) {
        return renderer.handleError(next)(err);
    }
};

/**
 * Try `postsPublic` first then `pagesPublic` — gift links can target either
 * (both share the `posts` table). Swallows not-found errors from each layer
 * so the caller sees a uniform `null` for "no such entry."
 *
 * @param {object} api
 * @param {object} query
 * @returns {Promise<{entry: object, resource: 'posts'|'pages'}|null>}
 */
async function readPostOrPage(api, query) {
    try {
        const result = await api.postsPublic.read(query);
        if (result?.posts?.[0]) {
            return {entry: result.posts[0], resource: 'posts'};
        }
    } catch (err) {
        // Not found / not eligible — fall through to pages.
    }
    try {
        const result = await api.pagesPublic.read(query);
        if (result?.pages?.[0]) {
            return {entry: result.pages[0], resource: 'pages'};
        }
    } catch (err) {
        // Not found.
    }
    return null;
}
