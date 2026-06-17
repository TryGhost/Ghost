/* eslint-disable @typescript-eslint/no-require-imports */
const routeMatch = require('path-match')();
/* eslint-enable @typescript-eslint/no-require-imports */

import type {ResourceLookupParams} from './lazy-find-resource';

const SUPPORTED_TOKENS = new Set([
    'id',
    'slug',
    'year',
    'month',
    'day',
    'primary_tag',
    'primary_author'
]);

const QUERYABLE_PARAMS = ['id', 'slug'] as const;

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

export function matchPermalink(template: string, urlPath: string): Record<string, string> | null {
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

    return params;
}

/**
 * Narrows the captured params down to the single column the DB is queried by,
 * or null when no queryable column is present — which, for a real resource
 * permalink, can't happen and signals an invalid permalink to the caller.
 */
export function toLookupParams(params: Record<string, string>): ResourceLookupParams | null {
    for (const key of QUERYABLE_PARAMS) {
        const value = params[key];
        if (value !== undefined) {
            return {[key]: value} as ResourceLookupParams;
        }
    }
    return null;
}

module.exports = {matchPermalink, toLookupParams};
module.exports.matchPermalink = matchPermalink;
module.exports.toLookupParams = toLookupParams;
