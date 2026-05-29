const labs = require('../../../shared/labs');
const logging = require('@tryghost/logging');
const Cookies = require('cookies');
const urlUtils = require('../../../shared/url-utils');
const isBotUserAgent = require('./is-bot-user-agent');

// Distinct prefix from the `gift` query param to avoid confusion. The cookie is
// named per-post (`gift_seen_<post_id>`) so reading multiple gifted posts can't
// collide, and its value is the token, making the count a distinct-clients proxy.
const GIFT_SEEN_COOKIE_PREFIX = 'gift_seen_';

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

/**
 * Count a gift read once per client+post: skip bots/scanners and repeat views
 * (de-duped via a post-scoped `gift_seen` cookie whose value is the token). The
 * counter write is fire-and-forget so it never blocks rendering. Call only when
 * the request actually rendered the gift's own post (post id match).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{id: string, post_id: string, token: string}} giftLink
 */
function countGiftRead(req, res, giftLink) {
    if (!giftLink) {
        return;
    }

    try {
        if (isBotUserAgent(req.get && req.get('user-agent'))) {
            return;
        }

        const cookieName = `${GIFT_SEEN_COOKIE_PREFIX}${giftLink.post_id}`;
        const cookies = new Cookies(req, res);
        if (cookies.get(cookieName) === giftLink.token) {
            return;
        }

        cookies.set(cookieName, giftLink.token, {
            // Full request path incl. any subdirectory mount, so the browser
            // reliably sends the cookie back to de-dupe repeat views.
            path: req.originalUrl.split('?')[0],
            httpOnly: true,
            sameSite: 'lax',
            secure: urlUtils.isSSL(urlUtils.getSiteUrl()),
            overwrite: true
        });

        const giftLinksService = require('./');
        // Fire-and-forget: never block rendering on the counter write.
        Promise.resolve(giftLinksService.api.recordRead(giftLink.id)).catch((err) => {
            logging.error(err);
        });
    } catch (err) {
        // Read-counting must never break rendering the post.
        logging.error(err);
    }
}

module.exports = {
    loadGiftLink,
    countGiftRead
};
