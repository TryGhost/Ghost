import type {Request, Response} from 'express';
import type {GiftLinksService} from './service';

// These modules use `module.exports =` / are untyped JS, so they're loaded via
// `require()` (matching their runtime CommonJS shape) rather than ESM imports.
/* eslint-disable @typescript-eslint/no-require-imports */
const logging = require('@tryghost/logging');
const Cookies = require('cookies');
const urlUtils = require('../../../shared/url-utils');
const isBotUserAgent = require('./is-bot-user-agent') as (userAgent: string | undefined | null) => boolean;
/* eslint-enable @typescript-eslint/no-require-imports */

// The cookie is named per-post (`ghost-gift-seen-<postId>`) so reading multiple
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

// The reader route prefix. The dedup cookie is scoped to this (not the specific
// `/g/<slug>/` path) so it's still sent — and the read still de-dupes — after a
// post is renamed and the controller canonicalises to a new slug. Kept in sync
// with GIFT_LINK_PREFIX in frontend/services/routing/gift-links-router (a server
// module can't import the frontend constant).
const GIFT_LINK_PREFIX = '/g/';

interface ReadContext {
    token: string;
    postId: string;
}

/**
 * Record a gift read once per client+post: skip bots/scanners and repeat views
 * (de-duped via a post-scoped `ghost-gift-seen-` cookie whose value is the
 * token). The counter write is fire-and-forget so it never blocks rendering.
 * Call only when the request actually rendered the gift's own post.
 *
 * This is the single seam the reader controller calls. The counting *mechanism*
 * (cookie dedup, bot filtering, the redemption write) is expected to change, so
 * it all lives behind this one boundary.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{token: string, postId: string}} read
 */
function recordRead(req: Request, res: Response, {token, postId}: ReadContext): void {
    try {
        if (isBotUserAgent(req.get && req.get('user-agent'))) {
            return;
        }

        const cookieName = `${GIFT_SEEN_COOKIE_PREFIX}${postId}`;
        // Pass `secure` at the CONSTRUCTOR level (not as a per-`.set()` option):
        // the cookies lib THROWS on `.set({secure: true})` when it can't see the
        // connection as https (e.g. a TLS-terminating proxy that doesn't forward
        // X-Forwarded-Proto), and that throw is swallowed below BEFORE
        // `recordRedemption` runs — so the read would never be counted. Setting
        // it on the constructor marks the cookie secure without the throw,
        // mirroring members-ssr.
        const cookies = new Cookies(req, res, {
            secure: urlUtils.isSSL(urlUtils.getSiteUrl())
        });
        if (cookies.get(cookieName) === token) {
            return;
        }

        cookies.set(cookieName, token, {
            // Scope to the `/g/` prefix (subdir-aware), not the slug-specific
            // path: the cookie name already encodes the post id, and scoping to
            // the prefix keeps dedup working across slug renames (the render
            // moves to a new `/g/<slug>/` path but the cookie still applies).
            path: urlUtils.urlJoin(urlUtils.getSubdir(), GIFT_LINK_PREFIX),
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
        // token (the redemption counter lives on the gift_links row).
        //
        // The dedup cookie is committed above, before this write resolves, so a
        // transient write failure undercounts that one client+post (the cookie
        // already marks them seen). This is an accepted tradeoff: the count is a
        // best-effort leak-detection proxy, not an exact ledger, and the
        // alternatives are worse — awaiting the write would block the render (or
        // turn a DB hiccup into a 500), and the cookie can't be set after the
        // response is sent. A durable/retryable write is deliberately left to a
        // future iteration of the mechanism, which lives wholly behind this seam.
        Promise.resolve(giftLinksService.service.recordRedemption(token)).catch((err: unknown) => {
            logging.error(err);
        });
    } catch (err) {
        // Read-counting must never break rendering the post.
        logging.error(err);
    }
}

// module.exports required - using `export` causes the module to fail to register
// when loaded via require()
module.exports = recordRead;
