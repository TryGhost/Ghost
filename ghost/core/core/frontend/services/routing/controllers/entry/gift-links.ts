import {format, parse} from 'node:url';
import type {ParsedUrlQueryInput} from 'node:querystring';
import type {Request} from 'express';
import type {Entry, EntryResponse} from '../entry';

const dataService = require('../../../data');
const renderer = require('../../../rendering');
const proxy = require('../../../proxy');

/**
 * Build this request's URL with `?gift` removed, preserving path, subdirectory
 * and other query params. Rebuilt from req.query (qs-parsed) so bracket forms
 * like `?gift[]=x` are dropped too — otherwise the stripped redirect would loop.
 */
function strippedGiftUrl(req: Request): string {
    const query = {...req.query} as ParsedUrlQueryInput;
    delete query.gift;
    return format({pathname: parse(req.originalUrl).pathname, query});
}

/**
 * Flag the render as a gift view so `ghost_foot` injects the toast. Stores the
 * token (not just a boolean) for a later analytics pass-through. Set on
 * res.locals so it merges onto the render context root (`@root._giftLink`),
 * where both `ghost_foot` and `ghost_head`'s tracker read it. Internal flag,
 * not a public theme API.
 */
function setGiftTemplateFlag(res: EntryResponse, token: string): void {
    res.locals._giftLink = token;
}

/**
 * Whether this request is an attempt to use a gift link: the feature is enabled
 * and a `?gift` param is present (in any form).
 */
export function isGiftRequest(req: Request): boolean {
    return proxy.labs.isSet('giftLinks') && req.query.gift !== undefined;
}

/**
 * The gift token from the request, or null. A non-string form (e.g. `?gift[]=x`)
 * isn't a token.
 */
function giftToken(req: Request): string | null {
    return typeof req.query.gift === 'string' ? req.query.gift : null;
}

/**
 * The id of the post a token unlocks, read through the content endpoint so the
 * check flows through the API like every other content read. Null for an unknown
 * token (the endpoint 404s).
 */
async function unlockedPostId(token: string): Promise<string | null> {
    try {
        const {gift_links: [link]} = await proxy.api.giftLinksPublic.read({token});
        return link?.post_id ?? null;
    } catch {
        return null;
    }
}

/**
 * Re-read the entry as a paid-member shim (the grant `/p/` previews use) to
 * reveal gated content, then render it. The shim is passed as the read context
 * only, so it never leaks into res.locals/@member.
 */
async function renderUnlocked(req: Request, res: EntryResponse, token: string) {
    const giftLookup = await dataService.entryLookup(req.path, res.routerOptions, {
        ...res.locals,
        member: await proxy.createPaidMemberShim()
    });

    // Don't index the unlocked variant; keep the token out of the Referer on
    // sub-resource requests.
    res.set('X-Robots-Tag', 'noindex');
    res.set('Referrer-Policy', 'no-referrer');
    setGiftTemplateFlag(res, token);

    return renderer.renderEntry(req, res)(giftLookup.entry);
}

/**
 * CASE: gift-link reader access. A gift link is the post's real URL plus
 * `?gift=TOKEN`; the token is verified against the entry living at this URL, so
 * a token for one post can never unlock another. A valid token unlocks the
 * entry; anything else strips `?gift` and 301s to the clean URL.
 */
export async function serveGiftRequest(req: Request, res: EntryResponse, entry: Entry) {
    const token = giftToken(req);

    if (token && await unlockedPostId(token) === entry.id) {
        return renderUnlocked(req, res, token);
    }

    // Invalid token, or one for a different post: strip it and 301 to the clean
    // URL (the page still renders, paywalled). res.redirect, not
    // urlUtils.redirect301, so the no-store set for ?gift requests survives and
    // the token-bearing redirect isn't cached.
    return res.redirect(301, strippedGiftUrl(req));
}
