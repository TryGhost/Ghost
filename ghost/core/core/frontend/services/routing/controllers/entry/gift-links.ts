import {format, parse} from 'node:url';
import type {ParsedUrlQueryInput} from 'node:querystring';
import type {Request} from 'express';
import type {EntryResponse} from '../entry';

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
 * Whether this request is an attempt to use a gift link: a `?gift` param is
 * present (in any form).
 */
export function isGiftRequest(req: Request): boolean {
    return req.query.gift !== undefined;
}

/**
 * The gift token from the request, or null. A non-string or empty form (e.g.
 * `?gift[]=x`, `?gift=`) isn't a token.
 */
export function giftToken(req: Request): string | null {
    return typeof req.query.gift === 'string' && req.query.gift !== '' ? req.query.gift : null;
}

export function isInvalidGiftTokenError(err: unknown): boolean {
    return (err as {code?: string} | null)?.code === 'INVALID_GIFT_TOKEN';
}

/**
 * Strip `?gift` and 301 to the clean URL (the page still renders, paywalled).
 * res.redirect, not urlUtils.redirect301, so the no-store set for ?gift
 * requests survives and the token-bearing redirect isn't cached.
 */
export function stripGiftAndRedirect(req: Request, res: EntryResponse) {
    return res.redirect(301, strippedGiftUrl(req));
}

/**
 * Prepare a verified gift render: don't index the unlocked variant, keep the
 * token out of the Referer on sub-resource requests, and set the internal
 * `_giftLink` flag on res.locals so it merges onto the render context root,
 * where `ghost_foot` (toast) and `ghost_head` (analytics) read it.
 */
export function prepareGiftRender(res: EntryResponse, token: string): void {
    res.set('X-Robots-Tag', 'noindex');
    res.set('Referrer-Policy', 'no-referrer');
    res.locals._giftLink = token;
}
