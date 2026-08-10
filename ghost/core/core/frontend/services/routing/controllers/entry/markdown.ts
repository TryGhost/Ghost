import type {Request, Response} from 'express';
import type {Entry, EntryResponse} from '../entry';
import buildCanonicalUrl from './canonical-url';

const config = require('../../../../../shared/config');
const urlUtils = require('../../../../../shared/url-utils').default;
const {getAcceptedMarkdownContentType, getMarkdownPath, renderEntryMarkdown} = require('../../../llms/markdown');

const MEMBERS_ONLY_MARKDOWN = '# Members-only content\n\nThis post requires a subscription and is not available for public access.\n';

function llmsEnabled(req: Request): boolean {
    const llmsService = req.app.get('llmsService') || null;
    return Boolean(llmsService && llmsService.isEnabled());
}

function getMachinePaymentsService(req: Request) {
    return req.app.get('machinePaymentsService') || null;
}

function toFetchRequest(req: Request): globalThis.Request {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || req.headers.host;
    const url = new URL(req.originalUrl || req.url, `${protocol}://${host}`);
    const headers = new Headers();

    Object.entries(req.headers).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            headers.set(key, value.join(', '));
        } else if (value !== undefined) {
            headers.set(key, String(value));
        }
    });

    return new globalThis.Request(url.toString(), {
        method: req.method || 'GET',
        headers
    });
}

async function copyFetchResponse(fetchResponse: globalThis.Response, res: Response) {
    res.status(fetchResponse.status);
    fetchResponse.headers.forEach((value, key) => {
        res.set(key, value);
    });
    return res.send(await fetchResponse.text());
}

/**
 * Only public entries ever render as markdown without payment; gated entries
 * stay html (or 403 / 402 on an explicit `.md` URL).
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

function refuseMembersOnlyMarkdown(res: Response) {
    return res.status(403).type('text/markdown').send(MEMBERS_ONLY_MARKDOWN);
}

/**
 * Challenge-before-render paid markdown path. Full HTML is loaded only after
 * the machine-payments orchestrator verifies payment.
 */
async function servePaidMarkdown(req: Request, res: EntryResponse, entry: Entry) {
    const machinePaymentsService = getMachinePaymentsService(req);

    if (!machinePaymentsService?.isPurchasable(entry)) {
        return refuseMembersOnlyMarkdown(res);
    }

    const resourceType = res.routerOptions.resourceType === 'pages' || res.routerOptions.context?.includes('page')
        ? 'pages'
        : 'posts';
    const llmsIndexUrl = urlUtils.urlFor({relativeUrl: '/llms.txt'}, true);
    const contentLocation = getMarkdownPath(new URL(entry.url).pathname);
    const fetchRequest = toFetchRequest(req);

    const response = await machinePaymentsService.challengeOrFulfill(fetchRequest, {
        entryId: entry.id,
        resourceType,
        description: typeof entry.title === 'string' ? entry.title : undefined,
        contentLocation,
        renderMarkdown: (paidEntry: Entry) => renderEntryMarkdown(paidEntry, {llmsIndexUrl})
    });

    return await copyFetchResponse(response, res);
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
 * refused or challenged via machine payments when enabled.
 */
export async function serveMdRequest(req: Request, res: EntryResponse, entry: Entry) {
    if (!llmsEnabled(req)) {
        return res.redirect(302, buildCanonicalUrl(req, entry));
    }

    if (!isPublic(entry)) {
        if (entry.visibility === 'paid' || entry.visibility === 'tiers') {
            return await servePaidMarkdown(req, res, entry);
        }

        return refuseMembersOnlyMarkdown(res);
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
