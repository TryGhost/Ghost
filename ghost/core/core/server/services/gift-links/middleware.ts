import type {Request, Response, NextFunction} from 'express';
import type {GiftLinksService} from './service';

// The content-only access grant the reader path carries on `res.locals.giftLink`:
// just the post the token unlocks and the token itself (for read-count dedup).
// Distinct from the service's `GiftLink` model — downstream consumers (gating,
// posts-public cache key, controller) only need the post id and the token.
interface GiftGrant {
    post_id: string;
    token: string;
}

// These modules use `module.exports =` / are untyped JS, so they're loaded via
// `require()` (matching their runtime CommonJS shape) rather than ESM imports.
/* eslint-disable @typescript-eslint/no-require-imports */
const labs = require('../../../shared/labs');
const logging = require('@tryghost/logging');
const Cookies = require('cookies');
const urlUtils = require('../../../shared/url-utils');
const isBotUserAgent = require('./is-bot-user-agent') as (userAgent: string | undefined | null) => boolean;
/* eslint-enable @typescript-eslint/no-require-imports */

// The cookie is named per-post (`ghost-gift-seen-<post_id>`) so reading multiple
// gifted posts can't collide, and its value is the token, making the count a
// distinct-clients proxy. The `ghost-` prefix is REQUIRED, not cosmetic: the
// Ghost(Pro) Fastly edge strips every request cookie except those matching
// `^(ghost-|_fs_ch_)` before forwarding to origin, so a non-`ghost-` name would
// never reach us and every view would recount (see BER-3737).
const GIFT_SEEN_COOKIE_PREFIX = 'ghost-gift-seen-';

// The dedup cookie must persist across browser sessions, otherwise the same
// reader recounts on every fresh session and inflates `redeemed_count` (which
// we surface as distinct uses). One year in milliseconds.
const GIFT_SEEN_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000;

/**
 * Frontend middleware: when a request hits `/g/<slug>/?key=TOKEN`, resolve the
 * key into a content-only access grant on `res.locals.giftLink` before routing
 * dispatches to the /g/ controller. The controller owns everything downstream:
 * the slug-match check, render/redirect, and exposing the `@gift` template
 * context on its verified render path. This middleware only resolves the
 * token.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function loadGiftLink(req: Request, res: Response, next: NextFunction) {
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

    // Lazy require avoids any boot-time load-order coupling; `.service` is wired in init().
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const giftLinksService = require('./') as {service: GiftLinksService};

    try {
        // The redesign's service resolves a token to its post (live links only);
        // a null result means no live link for this token → no grant.
        const post = await giftLinksService.service.getPostByToken(token);
        if (post) {
            res.locals.giftLink = {
                post_id: post.id,
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
        logging.warn(`Failed to resolve gift link token: ${(err as Error).message}`);
    }

    return next();
}

/**
 * Count a gift read once per client+post: skip bots/scanners and repeat views
 * (de-duped via a post-scoped `ghost-gift-seen-` cookie whose value is the token). The
 * counter write is fire-and-forget so it never blocks rendering. Call only when
 * the request actually rendered the gift's own post (post id match).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{post_id: string, token: string}} giftLink
 */
function countGiftRead(req: Request, res: Response, giftLink: GiftGrant | null) {
    if (!giftLink) {
        return;
    }

    try {
        if (isBotUserAgent(req.get && req.get('user-agent'))) {
            return;
        }

        const cookieName = `${GIFT_SEEN_COOKIE_PREFIX}${giftLink.post_id}`;
        // Pass `secure` at the CONSTRUCTOR level (not as a per-`.set()` option):
        // the cookies lib THROWS on `.set({secure: true})` when it can't see the
        // connection as https (e.g. a TLS-terminating proxy that doesn't forward
        // X-Forwarded-Proto), and that throw is swallowed below BEFORE
        // `recordRedemption` runs — so the read would never be counted. Setting it on
        // the constructor marks the cookie secure without the throw, mirroring
        // members-ssr.
        const cookies = new Cookies(req, res, {
            secure: urlUtils.isSSL(urlUtils.getSiteUrl())
        });
        if (cookies.get(cookieName) === giftLink.token) {
            return;
        }

        cookies.set(cookieName, giftLink.token, {
            // Full request path incl. any subdirectory mount, so the browser
            // reliably sends the cookie back to de-dupe repeat views.
            path: req.originalUrl.split('?')[0],
            httpOnly: true,
            sameSite: 'lax',
            // Long-lived so the once-per-client-per-post dedup persists across
            // browser sessions (a session-only cookie recounts every session).
            maxAge: GIFT_SEEN_COOKIE_MAX_AGE,
            overwrite: true
        });

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const giftLinksService = require('./') as {service: GiftLinksService};
        // Fire-and-forget: never block rendering on the counter write. Keyed by
        // token (the redesign's redemption counter lives on the gift_links row).
        Promise.resolve(giftLinksService.service.recordRedemption(giftLink.token)).catch((err) => {
            logging.error(err);
        });
    } catch (err) {
        // Read-counting must never break rendering the post.
        logging.error(err);
    }
}

// module.exports required - using `export` causes the module to fail to register
// when loaded via require()
module.exports = {
    loadGiftLink,
    countGiftRead
};
