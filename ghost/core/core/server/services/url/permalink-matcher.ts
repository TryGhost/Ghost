const routeMatch = require('path-match')();

import type {ResourceLookupParams} from './lazy-url-service';

export type PermalinkParams = ResourceLookupParams & {
    year?: string;
    month?: string;
    day?: string;
    primary_tag?: string;
    primary_author?: string;
};

const SUPPORTED_TOKENS = new Set([
    'id',
    'slug',
    'year',
    'month',
    'day',
    'primary_tag',
    'primary_author'
]);

const FIELD_VALIDATORS: Record<string, RegExp> = {
    id: /^[0-9a-f]{24}$/i,
    year: /^\d{4}$/,
    month: /^\d{2}$/,
    day: /^\d{2}$/
};

const TOKEN = /:([A-Za-z_]\w*)/g;
const PARAM = /:([A-Za-z_]\w*)(?:\([^)]*\))?[+*?]?/g;
const BARE_PARAM = /:([A-Za-z_]\w*)(?![\w(])/g;

function constrainHyphenatedPermalinkParams(permalink: string): string {
    return permalink.split('/').map((segment) => {
        if (!segment.includes('-')) {
            return segment;
        }

        const params = [...segment.matchAll(PARAM)];

        if (params.length < 2) {
            return segment;
        }

        return segment.replace(BARE_PARAM, (match, ...args) => {
            const offset = args[args.length - 2];
            const index = params.findIndex(param => param.index === offset);
            const isLastParamInSegment = index === params.length - 1;

            return `${match}${isLastParamInSegment ? '([^/]+)' : '([^-/]+)'}`;
        });
    }).join('/');
}

function hasOnlySupportedTokens(template: string): boolean {
    for (const [, token] of template.matchAll(TOKEN)) {
        if (!SUPPORTED_TOKENS.has(token)) {
            return false;
        }
    }
    return true;
}

function valuesFitTheirFormat(params: Record<string, string>): boolean {
    for (const [field, value] of Object.entries(params)) {
        const pattern = FIELD_VALIDATORS[field];
        if (pattern && !pattern.test(value)) {
            return false;
        }
    }
    return true;
}

export function matchPermalink(template: string, urlPath: string): PermalinkParams | null {
    if (!hasOnlySupportedTokens(template)) {
        return null;
    }

    const match = routeMatch(constrainHyphenatedPermalinkParams(template));

    let params: Record<string, string> | false;
    try {
        params = match(urlPath);
    } catch {
        // path-match throws a 400 on an undecodable %-escape; treat as no match.
        return null;
    }

    if (params === false) {
        return null;
    }

    if (!valuesFitTheirFormat(params)) {
        return null;
    }

    if (params.id === undefined && params.slug === undefined) {
        return null;
    }

    return params as PermalinkParams;
}

/**
 * Narrows a matched permalink down to the single unique column the DB is
 * queried by. matchPermalink guarantees a queryable column is present, so this
 * is total — there is no "no lookup column" case to handle.
 */
export function toLookupParams(params: PermalinkParams): ResourceLookupParams {
    if ('id' in params) {
        return {id: params.id};
    }
    return {slug: params.slug};
}

module.exports = {matchPermalink, toLookupParams};
module.exports.matchPermalink = matchPermalink;
module.exports.toLookupParams = toLookupParams;
