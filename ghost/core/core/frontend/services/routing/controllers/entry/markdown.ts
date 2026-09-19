import type { NextFunction, Request, Response } from 'express';
import type { ApiCallSpec } from '../../api-adapter';
import type { Entry, EntryResponse } from '../entry';
import buildCanonicalUrl from './canonical-url';

const urlUtils = require('../../../../../shared/url-utils').default;
const { getGatedNotice, getMarkdownPath, renderEntryMarkdown } = require('../../../llms/markdown');
const { resolveRouteData } = require('../../api-adapter');
const renderer = require('../../../rendering');

const MEMBERS_ONLY_MARKDOWN =
  '# Members-only content\n\nThis post requires a subscription and is not available for public access.\n';

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
    headers,
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
 * stay html (or preview / 402 on an explicit `.md` URL).
 */
function isPublic(entry: Entry): boolean {
  return entry.visibility === 'public';
}

function getContentLocation(res: EntryResponse, entry: Entry): string {
  const canonicalPath = res.routerOptions.canonicalPath;
  const pathname = typeof canonicalPath === 'string' ? canonicalPath : new URL(entry.url).pathname;
  return getMarkdownPath(pathname);
}

function serveMarkdown(res: EntryResponse, entry: Entry) {
  const llmsIndexUrl = urlUtils.urlFor({ relativeUrl: '/llms.txt' }, true);
  res.set('Content-Location', getContentLocation(res, entry));
  res.type('text/markdown');
  return res.send(renderEntryMarkdown(entry, { llmsIndexUrl }));
}

/**
 * The content API does not serialize `type`, so the notice wording has to come
 * from the route rather than the entry.
 */
function getResourceKind(res: EntryResponse): 'page' | 'post' {
  return res.routerOptions.resourceType === 'pages' || res.routerOptions.context?.includes('page')
    ? 'page'
    : 'post';
}

/**
 * Public free-preview for gated entries (access === false). Same truncated
 * html the web renderer shows, plus a subscription notice and Portal CTA.
 */
function servePreviewMarkdown(res: EntryResponse, entry: Entry) {
  const llmsIndexUrl = urlUtils.urlFor({ relativeUrl: '/llms.txt' }, true);
  const subscribeUrl = urlUtils.urlFor({ relativeUrl: '/#/portal/signup' }, true);

  res.set('Content-Location', getContentLocation(res, entry));
  res.type('text/markdown');
  return res.send(
    renderEntryMarkdown(entry, {
      llmsIndexUrl,
      notice: getGatedNotice(entry, getResourceKind(res)),
      cta: `Subscribe: ${subscribeUrl}`,
    }),
  );
}

function refuseMembersOnlyMarkdown(res: Response) {
  return res.status(403).type('text/markdown').send(MEMBERS_ONLY_MARKDOWN);
}

function formatPaymentAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/**
 * Challenge-before-render paid markdown path. Full HTML is loaded only after
 * the machine-payments orchestrator verifies payment. Unpaid challenges carry
 * the free preview + an agent upsell CTA in a text/markdown body.
 */
async function servePaidMarkdown(req: Request, res: EntryResponse, entry: Entry) {
  const machinePaymentsService = getMachinePaymentsService(req);

  if (!machinePaymentsService?.isPurchasable(entry)) {
    // access===true means entry.html is the full post — never cache that
    // publicly. Fall back to the 403 stub for members who already have access.
    if (entry.access === true) {
      return refuseMembersOnlyMarkdown(res);
    }
    return servePreviewMarkdown(res, entry);
  }

  const resourceKind = getResourceKind(res);
  const resourceType = resourceKind === 'page' ? 'pages' : 'posts';
  const llmsIndexUrl = urlUtils.urlFor({ relativeUrl: '/llms.txt' }, true);
  const contentLocation = getContentLocation(res, entry);
  const fetchRequest = toFetchRequest(req);

  const response = await machinePaymentsService.challengeOrFulfill(fetchRequest, {
    entryId: entry.id,
    resourceType,
    description: typeof entry.title === 'string' ? entry.title : undefined,
    contentLocation,
    renderMarkdown: (paidEntry: Entry) => renderEntryMarkdown(paidEntry, { llmsIndexUrl }),
    // Only attach a preview when the entry is already gated (access !== true).
    // When access===true, entry.html is the full post and must not appear on 402.
    ...(entry.access !== true
      ? {
          renderPreviewMarkdown: (terms: { amount: number; currency: string }) => {
            const price = formatPaymentAmount(terms.amount, terms.currency);
            return renderEntryMarkdown(entry, {
              llmsIndexUrl,
              notice: getGatedNotice(entry, resourceKind),
              cta: [
                `Agents can purchase one-shot access to the full markdown for ${price} per request via MPP or x402 — see the WWW-Authenticate response header for payment terms.`,
                `Subscribe: ${urlUtils.urlFor({ relativeUrl: '/#/portal/signup' }, true)}`,
              ],
            });
          },
        }
      : {}),
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
 * disabled we redirect to the canonical (html) url; gated content shows the
 * free preview (or a machine-payments challenge when enabled).
 */
export async function serveMdRequest(req: Request, res: EntryResponse, entry: Entry) {
  if (!llmsEnabled(req)) {
    const canonicalPath = res.routerOptions.canonicalPath;
    return res.redirect(
      302,
      buildCanonicalUrl(req, entry, typeof canonicalPath === 'string' ? canonicalPath : undefined),
    );
  }

  if (!isPublic(entry)) {
    // Member with access still holds full html on the entry. Serving it at
    // 200 with public cache headers would leak paid content to the CDN.
    // Member `.md` unlock is out of scope — keep today's 403 / payment path.
    if (entry.access === true) {
      if (entry.visibility === 'paid' || entry.visibility === 'tiers') {
        return await servePaidMarkdown(req, res, entry);
      }

      return refuseMembersOnlyMarkdown(res);
    }

    if (entry.visibility === 'paid' || entry.visibility === 'tiers') {
      return await servePaidMarkdown(req, res, entry);
    }

    return servePreviewMarkdown(res, entry);
  }

  return serveMarkdown(res, entry);
}

export async function serveRouteMdRequest(req: Request, res: EntryResponse, next: NextFunction) {
  try {
    const queries = Object.values(resolveRouteData(res.routerOptions.data)) as ApiCallSpec[];
    const query = queries.find(
      ({ type, resource }) => type === 'read' && (resource === 'pages' || resource === 'posts'),
    );

    if (!query) {
      return next();
    }

    const api = require('../../../proxy').api;
    const options = {
      ...query.options,
      include: 'authors,tags,tiers',
      context: { member: res.locals.member },
    };
    const result = await api[query.controller][query.type](options);
    const entry = result[query.resource][0];

    if (!entry) {
      return next();
    }

    res.routerOptions.resourceType = query.resource;
    return await serveMdRequest(req, res, entry);
  } catch (err) {
    return renderer.handleError(next)(err);
  }
}
