const labs = require('../../../shared/labs');
const logging = require('@tryghost/logging');

/**
 * Frontend middleware: resolve a `?gift=TOKEN` query param into a content-only
 * access grant for the rest of the request.
 *
 * - Sets `res.locals.giftLink` (post id + token) when the token is valid+active,
 *   which the entry data fetch threads into the gating serializer (forPost).
 * - Marks ANY gift request `noindex` (canonical already points to the clean URL)
 *   and applies a strict `Referrer-Policy` to limit token leakage via Referer.
 *
 * Cache bypass for gift requests is handled separately in frontend-caching.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function loadGiftLink(req, res, next) {
    // Coerce to string: Express's query parser turns `?gift[x]=y` into an object
    // and `?gift=a&gift=b` into an array — only a plain string is a real token.
    const token = typeof req.query.gift === 'string' ? req.query.gift : null;

    if (!token || !labs.isSet('giftLinks')) {
        return next();
    }

    res.set('X-Robots-Tag', 'noindex');
    res.set('Referrer-Policy', 'no-referrer');

    // Lazy require avoids any boot-time load-order coupling; `.api` is wired in init().
    const giftLinksService = require('./');

    try {
        const giftLink = await giftLinksService.api.getActiveByToken(token);
        if (giftLink) {
            res.locals.giftLink = {
                id: giftLink.id,
                post_id: giftLink.get('post_id'),
                token
            };
        }
    } catch (err) {
        // Invalid/unknown token → no grant; fall through to the normal paywalled page.
        logging.warn(`Failed to resolve gift link token: ${err.message}`);
    }

    return next();
}

module.exports = {
    loadGiftLink
};
