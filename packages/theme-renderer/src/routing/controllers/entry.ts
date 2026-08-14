/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/routing/controllers/entry.ts @ 407e032dc7 —
// transforms: CJS/Express → ESM + ports; gift-link pre-checks and markdown
// (llms) negotiation dropped per extraction-map §(a) (out of the package's
// scope); `urlUtils.redirectToAdmin`/`urlUtils.redirect301` → `{redirect}`
// result values (redirectToAdmin's URL construction — urlJoin(urlFor('admin'),
// path, '/') — is reproduced inline); @tryghost/debug → dropped.
import {config, urlUtils} from '../../seam/proxy.ts';
import entryLookup from '../../data/entry-lookup.ts';
import renderEntry from '../../rendering/render-entry.ts';
import handleError from '../../rendering/error.ts';
import buildCanonicalUrl from './entry/canonical-url.ts';
import type {PortRequest, PortResponse, RenderResult, RouterOptions} from '../../ports.ts';

export type {RouterOptions};

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
function editRedirect(res: PortResponse, entry: Entry): RenderResult {
    if (!config.get('admin:redirects')) {
        return {next: true};
    }

    const resourceType = res.routerOptions.context?.includes('page') ? 'page' : 'post';
    // urlUtils.redirectToAdmin(302, res, path) builds
    // urlJoin(urlFor('admin', true), path, '/') and 302-redirects to it.
    return {
        redirect: {
            status: 302,
            url: urlUtils.urlJoin(urlUtils.urlFor('admin' as any, true), `/#/editor/${resourceType}/${entry.id}`, '/')
        }
    };
}

/**
 * The requested path no longer matches the entry's canonical url — happens with
 * date permalinks after a publish date change.
 */
function isPermalinkStale(req: PortRequest, entry: Entry): boolean {
    return urlUtils.absoluteToRelative(entry.url, {withoutSubdirectory: true}) !== req.path;
}

export async function entryController(req: PortRequest, res: PortResponse): Promise<RenderResult> {
    try {
        const lookup = await entryLookup(req.path, res.routerOptions, res.locals);
        const entry = lookup ? lookup.entry : false;

        if (!entry || lookup.isUnknownOption) {
            return {next: true};
        }

        if (lookup.isEditURL) {
            return editRedirect(res, entry);
        }

        if (isPermalinkStale(req, entry)) {
            // urlUtils.redirect301 → 301 redirect result value
            return {redirect: {status: 301, url: buildCanonicalUrl(req, entry)}};
        }

        return renderEntry(req, res)(entry);
    } catch (err) {
        return handleError(err);
    }
}
