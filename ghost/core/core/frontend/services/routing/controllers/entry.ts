import type {NextFunction, Request, Response} from 'express';
import * as markdown from './entry/markdown';
import * as giftLinks from './entry/gift-links';
import buildCanonicalUrl from './entry/canonical-url';

const debug = require('@tryghost/debug')('services:routing:controllers:entry');
const config = require('../../../../shared/config');
const urlUtils = require('../../../../shared/url-utils');
const dataService = require('../../data');
const renderer = require('../../rendering');

// Routing context the router attaches to the matched entry's response.
export interface RouterOptions {
    isMarkdownRequest?: boolean;
    context?: string[];
    [key: string]: unknown;
}

export interface EntryResponse extends Response {
    routerOptions: RouterOptions;
}

// The resolved post/page entry from the data layer; only the fields used here are typed.
export interface Entry {
    id: string;
    url: string;
    visibility: string;
    [key: string]: unknown;
}

/**
 * The request's last url param is `/edit`: redirect to the admin editor, or fall
 * through to a 404 when admin redirects are disabled.
 */
function editRedirect(res: EntryResponse, next: NextFunction, entry: Entry) {
    if (!config.get('admin:redirects')) {
        debug('is edit url but admin redirects are disabled');
        return next();
    }

    debug('redirect. is edit url');
    const resourceType = res.routerOptions.context?.includes('page') ? 'page' : 'post';
    return urlUtils.redirectToAdmin(302, res, `/#/editor/${resourceType}/${entry.id}`);
}

/**
 * The requested path no longer matches the entry's canonical url — happens with
 * date permalinks after a publish date change.
 */
function isPermalinkStale(req: Request, entry: Entry): boolean {
    return urlUtils.absoluteToRelative(entry.url, {withoutSubdirectory: true}) !== req.path;
}

export async function entryController(req: Request, res: EntryResponse, next: NextFunction): Promise<void | Response> {
    debug('entryController', res.routerOptions);

    try {
        // A gift view is html-only. Redirecting before the lookup keeps the
        // token off the read, so markdown paths can never see an unlocked entry.
        if (giftLinks.isGiftRequest(req) && (markdown.isMdRequest(res) || markdown.isAcceptsRequest(req))) {
            return giftLinks.stripGiftAndRedirect(req, res);
        }

        // The raw gift token rides the lookup as read context; the API read
        // verifies it against the entry and unlocks, or rejects the lookup.
        const giftToken = giftLinks.isGiftRequest(req) ? giftLinks.giftToken(req) : null;

        let lookup;
        try {
            lookup = await dataService.entryLookup(req.path, res.routerOptions, res.locals, {giftToken});
        } catch (err) {
            if (giftLinks.isInvalidGiftTokenError(err)) {
                return giftLinks.stripGiftAndRedirect(req, res);
            }
            throw err;
        }
        const entry = lookup ? lookup.entry : false;

        if (!entry || lookup.isUnknownOption) {
            debug('no entry or unknown option');
            return next();
        }

        if (lookup.isEditURL) {
            return editRedirect(res, next, entry);
        }

        // MUST run before the permalink redirect below: a `.md` path can never
        // equal the entry's canonical (html) path, so the redirect would always
        // fire and 301 the request to html, losing the markdown intent.
        if (markdown.isMdRequest(res)) {
            return markdown.serveMdRequest(req, res, entry);
        }

        if (isPermalinkStale(req, entry)) {
            debug('redirect');
            return urlUtils.redirect301(res, buildCanonicalUrl(req, entry));
        }

        // MUST run after the permalink redirect above: negotiation rides on the
        // canonical URL, so a stale dated-permalink URL is 301'd to canonical
        // first, then markdown is served.
        if (markdown.isAcceptsRequest(req) && markdown.isPublic(entry)) {
            return markdown.serveAcceptsRequest(res, entry);
        }

        if (giftLinks.isGiftRequest(req)) {
            if (!giftToken) {
                return giftLinks.stripGiftAndRedirect(req, res);
            }
            // Reaching here means the lookup verified the token: the entry is
            // the unlocked variant.
            giftLinks.prepareGiftRender(res, giftToken);
        }

        return renderer.renderEntry(req, res)(entry);
    } catch (err) {
        return renderer.handleError(next)(err);
    }
};
