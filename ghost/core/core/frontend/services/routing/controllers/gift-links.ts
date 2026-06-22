import type {Request, Response, NextFunction} from 'express';

// These modules use `module.exports =` / are untyped JS, so they're loaded via
// `require()` (matching their runtime CommonJS shape) rather than ESM imports.
/* eslint-disable @typescript-eslint/no-require-imports */
const debug = require('@tryghost/debug')('services:routing:controllers:gift-links');
const _ = require('lodash');
const labs = require('../../../../shared/labs');
const renderer = require('../../rendering');
const hbs = require('../../theme-engine/engine');
const proxy = require('../../proxy');
const urlUtils = require('../../../../shared/url-utils');
const {GIFT_LINK_PREFIX} = require('../gift-links-router') as {GIFT_LINK_PREFIX: string};
/* eslint-enable @typescript-eslint/no-require-imports */

interface Entry {
    slug: string;
    url?: string;
    [key: string]: unknown;
}

// The public content API is untyped JS; describe only the shape this controller
// reads from it.
interface PublicApi {
    postsPublic: {read(query: Record<string, unknown>): Promise<{posts?: Entry[]}>};
    pagesPublic: {read(query: Record<string, unknown>): Promise<{pages?: Entry[]}>};
}

// `res.routerOptions` is the frontend routing context bag — not on the stock
// Express Response, so augment it locally.
type GiftResponse = Response & {
    routerOptions: {context?: string[]; [key: string]: unknown};
};

// Whether a token resolves to a post or a page decides which public read
// controller serves it (both share the `posts` table).
const RESOURCE_BY_TYPE = {
    page: {controller: 'pagesPublic' as const, resource: 'pages' as const, context: ['page']},
    post: {controller: 'postsPublic' as const, resource: 'posts' as const, context: ['post']}
};

/**
 * True only for genuine "no such entry" errors. Anything else (DB timeout,
 * serializer crash, etc.) must surface as a 5xx rather than be misread as
 * not-found and 301'd to the canonical URL.
 */
function isNotFoundError(err: unknown): boolean {
    return Boolean(err && (err as {errorType?: string}).errorType === 'NotFoundError');
}

/**
 * Read a single published entry via the given public controller, treating
 * not-found as `null` (any other error rethrows). The public API only returns
 * published entries, so a non-null result is sufficient — you can't gift a
 * draft, and a since-unpublished post simply resolves to null here.
 */
async function readPublished(
    api: PublicApi,
    controller: 'postsPublic' | 'pagesPublic',
    resource: 'posts' | 'pages',
    query: Record<string, unknown>
): Promise<Entry | null> {
    try {
        const result = await api[controller].read(query);
        return (result as Record<string, Entry[] | undefined>)[resource]?.[0] ?? null;
    } catch (err) {
        if (isNotFoundError(err)) {
            return null;
        }
        throw err;
    }
}

/**
 * Resolve the URL slug to its canonical published post/page (post first, then
 * page). Used only on the invalid path to redirect a bad/missing token away
 * from `/g/`.
 */
async function resolveCanonicalBySlug(api: PublicApi, slug: string): Promise<Entry | null> {
    const post = await readPublished(api, 'postsPublic', 'posts', {slug});
    if (post) {
        return post;
    }
    return readPublished(api, 'pagesPublic', 'pages', {slug});
}

/**
 * Gift Link Controller — owns the whole `/g/:slug/?key=TOKEN` flow.
 *
 * Token is authoritative; the slug is cosmetic. Flow:
 *   1. Read `?key=` (string only — an array/object query value is not a token).
 *   2. Resolve the token to its post via the gift-links service (live links
 *      only — a revoked/reissued/unknown token resolves to null).
 *   3. Read that post by id through the public content API, granting access via
 *      a synthetic all-paid-tiers member (the same grant `/p/` previews use).
 *   4. If the URL slug is stale, 301 to `/g/<current-slug>/?key=…` (keep the
 *      key — a renamed post must still open). Otherwise render the unlocked
 *      entry through the standard pipeline, flagged with the internal `_gift`
 *      template flag and `noindex` / `no-referrer` headers.
 *   5. Invalid path (missing/invalid token, or the post is gone): 301 the URL
 *      slug to its canonical URL with the key dropped, or 404 if it doesn't
 *      resolve — or if the target is itself under `/g/` (the redirect-loop
 *      guard, since a routes.yaml collection could permalink under `/g/`).
 *
 * Cache headers (`no-store`) are set by [frontend-caching.js] via the `/g/`
 * path check, covering both rendered responses and the 301s emitted here.
 */
async function giftLinksController(req: Request, res: GiftResponse, next: NextFunction) {
    debug('giftLinksController');

    if (!labs.isSet('giftLinks')) {
        return next();
    }

    const api = proxy.api as PublicApi;
    const giftLinksService = proxy.giftLinks;
    const urlSlug = req.params.slug;

    // Express's query parser turns `?key[x]=y` into an object and `?key=a&key=b`
    // into an array — only a plain string is a real token.
    const key = typeof req.query.key === 'string' ? req.query.key : null;

    try {
        if (key) {
            const resolved = await giftLinksService.service.getPostByToken(key);

            if (resolved) {
                const {controller, resource, context} = resolved.type === 'page' ? RESOURCE_BY_TYPE.page : RESOURCE_BY_TYPE.post;

                // Grant access the way `/p/` previews do: render as a member
                // with every active paid tier, so the existing gating reveals
                // member-only content unchanged. The synthetic member lands at
                // `frame.original.context.member` for the read (and so varies
                // the posts-public cache key by member.products), and never
                // leaks into `@member` (themes read res.locals.member).
                const member = await proxy.synthesizePaidMember();

                const entry = await readPublished(api, controller, resource, {
                    id: resolved.id,
                    include: 'authors,tags,tiers',
                    context: {member}
                });

                if (entry) {
                    // Token authoritative, slug cosmetic: a stale slug still
                    // works — canonicalise to the current slug, keeping the key.
                    // Subdir-safe: prefix any configured subdirectory.
                    if (urlSlug !== entry.slug) {
                        const canonicalGiftPath = urlUtils.urlJoin(urlUtils.getSubdir(), GIFT_LINK_PREFIX, entry.slug, '/');
                        return res.redirect(301, `${canonicalGiftPath}?key=${encodeURIComponent(key)}`);
                    }

                    res.routerOptions.context = context;

                    // Always-on defence in depth: don't index gift URLs, and
                    // limit Referer leakage of the token to sub-resources.
                    res.set('X-Robots-Tag', 'noindex');
                    res.set('Referrer-Policy', 'no-referrer');

                    // Internal `_gift` flag — set only on the verified render
                    // path (valid token, matching slug). The ghost_foot helper
                    // consumes it to inject the gift toast; underscore-prefixed
                    // per the `_queryCache` precedent, so it's not a committed
                    // public theme API.
                    const localTemplateOptions = hbs.getLocalTemplateOptions(res.locals);
                    hbs.updateLocalTemplateOptions(res.locals, _.merge({}, localTemplateOptions, {
                        data: {_gift: true}
                    }));

                    // Count the read (bot-filtered, cookie-deduped, fire-and-
                    // forget). Only here, on the verified render path — never on
                    // redirects or 404s — so a bad slug or invalid key can't
                    // inflate the count.
                    giftLinksService.recordRead(req, res, {token: key, postId: resolved.id});

                    return renderer.renderEntry(req, res)(entry);
                }
            }
        }

        // Invalid / missing / unresolved → redirect the URL slug to its
        // canonical URL (NOT the token's post — that would leak a renamed
        // slug), dropping the key. 404 if it doesn't resolve, or if the target
        // is under `/g/` (would re-enter this controller and loop forever — a
        // routes.yaml collection can permalink under `/g/`) or is this exact
        // request path.
        const fallback = await resolveCanonicalBySlug(api, urlSlug);
        if (fallback?.url) {
            // Canonical URLs are absolute; compare on pathname only. The `/g/`
            // and self-path checks must account for any configured
            // subdirectory: `req.path` is mount-relative (no subdir) but the
            // canonical pathname includes it, so prefix the subdir onto both
            // comparison baselines.
            let targetPath = fallback.url;
            try {
                targetPath = new URL(fallback.url).pathname;
            } catch {
                // Already a path (or unparseable) — compare as-is.
            }
            const giftPrefix = urlUtils.urlJoin(urlUtils.getSubdir(), GIFT_LINK_PREFIX);
            const requestPath = urlUtils.urlJoin(urlUtils.getSubdir(), req.path);
            if (!targetPath.startsWith(giftPrefix) && targetPath !== requestPath) {
                return res.redirect(301, fallback.url);
            }
        }

        return next();
    } catch (err) {
        return renderer.handleError(next)(err);
    }
}

// module.exports required - using `export` causes the module to fail to register
// when loaded via require()
module.exports = giftLinksController;
