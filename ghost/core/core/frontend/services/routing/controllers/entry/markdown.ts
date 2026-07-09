import type {Request, Response} from 'express';
import type {Entry, EntryResponse} from '../entry';
import buildCanonicalUrl from './canonical-url';

const config = require('../../../../../shared/config');
const urlUtils = require('../../../../../shared/url-utils');
const {getAcceptedMarkdownContentType, getMarkdownPath, renderEntryMarkdown} = require('../../../llms/markdown');

const MEMBERS_ONLY_MARKDOWN = '# Members-only content\n\nThis post requires a subscription and is not available for public access.\n';

function llmsEnabled(req: Request): boolean {
    const llmsService = req.app.get('llmsService') || null;
    return Boolean(llmsService && llmsService.isEnabled());
}

/**
 * Only public entries ever render as markdown; gated entries stay html (or
 * 403 on an explicit `.md` URL).
 */
export function isPublic(entry: Entry): boolean {
    return entry.visibility === 'public';
}

function serveMarkdown(res: Response, entry: Entry) {
    const llmsIndexUrl = urlUtils.urlFor({relativeUrl: '/llms.txt'}, true);
    res.set('Cache-Control', `public, max-age=${config.get('caching:llms:maxAge')}`);
    res.set('Content-Location', getMarkdownPath(new URL(entry.url).pathname));
    res.type('text/markdown');
    return res.send(renderEntryMarkdown(entry, {llmsIndexUrl}));
}

/**
 * Whether this is a `.md` URL request (the scoped suffix route sets the flag).
 */
export function isMdRequest(res: EntryResponse): boolean {
    return Boolean(res.routerOptions.isMarkdownRequest);
}

/**
 * Serve a `.md` URL as markdown for LLM consumption. When the feature is
 * disabled we redirect to the canonical (html) url; members-only content is
 * refused.
 */
export function serveMdRequest(req: Request, res: Response, entry: Entry) {
    if (!llmsEnabled(req)) {
        return res.redirect(302, buildCanonicalUrl(req, entry));
    }

    if (!isPublic(entry)) {
        return res.status(403).type('text/markdown').send(MEMBERS_ONLY_MARKDOWN);
    }

    return serveMarkdown(res, entry);
}

/**
 * Whether the request negotiates markdown via the Accept header (and the llms
 * feature is on) — request knowledge only, so it can be decided before the
 * entry lookup. Whether markdown is actually served still depends on the
 * entry: see `isPublic`.
 */
export function isAcceptsRequest(req: Request): boolean {
    return Boolean(getAcceptedMarkdownContentType(req)) && llmsEnabled(req);
}

/**
 * Serve markdown negotiated via the Accept header.
 */
export function serveAcceptsRequest(res: Response, entry: Entry) {
    res.vary('Accept');
    return serveMarkdown(res, entry);
}
