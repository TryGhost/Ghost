const labs = require('../../../shared/labs');
const logging = require('@tryghost/logging');
const Cookies = require('cookies');
const urlUtils = require('../../../shared/url-utils');
const isBotUserAgent = require('./is-bot-user-agent');

// The cookie is named per-post (`gift_seen_<post_id>`) so reading multiple
// gifted posts can't collide, and its value is the token, making the count a
// distinct-clients proxy.
const GIFT_SEEN_COOKIE_PREFIX = 'gift_seen_';

/**
 * Frontend middleware: when a request hits `/g/<slug>/?key=TOKEN`, resolve the
 * key into a content-only access grant on `res.locals.giftLink` before the
 * theme middleware reads it (the {{content}} helper renders the gift callout
 * iff `data.gift.post_id === post.id`, so the grant has to land BEFORE
 * `update-local-template-options` runs).
 *
 * This is mounted globally at the site level rather than inside the
 * GiftLinksRouter for that ordering reason. The router's controller is
 * responsible for the slug-match check + render/redirect; this middleware
 * only resolves the token.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function loadGiftLink(req, res, next) {
    if (!labs.isSet('giftLinks')) {
        return next();
    }
    if (!req.path || !req.path.startsWith('/g/')) {
        return next();
    }

    // Coerce to string: Express's query parser turns `?key[x]=y` into an
    // object and `?key=a&key=b` into an array — only a plain string is a
    // real token.
    const token = typeof req.query.key === 'string' ? req.query.key : null;
    if (!token) {
        return next();
    }

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
            // Always-on for gift requests: defence in depth on top of
            // `rel=canonical` pointing back to /<slug>/, and limit Referer
            // leakage of the token to third-party sub-resources.
            res.set('X-Robots-Tag', 'noindex');
            res.set('Referrer-Policy', 'no-referrer');
        }
    } catch (err) {
        // Invalid/unknown token → no grant; controller will 301 to canonical.
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
