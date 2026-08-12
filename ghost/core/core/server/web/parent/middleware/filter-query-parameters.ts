import logging from '@tryghost/logging';
import querystring from 'node:querystring';
import type {NextFunction, Request, Response} from 'express';

import {
    CONTENT_API_QUERY_PARAMETER_ALLOWLIST,
    QUERY_PARAMETER_ALLOWLIST
} from './query-parameter-allowlist';

const allowedQueryParameters: ReadonlySet<string> = new Set(QUERY_PARAMETER_ALLOWLIST);
const allowedContentApiQueryParameters: ReadonlySet<string> = new Set(CONTENT_API_QUERY_PARAMETER_ALLOWLIST);

const CONTENT_API_PATH_PATTERN = /\/ghost\/api\/(?:(?:v[0-9]+|canary)\/content|content)(?:\/|$)/;

const EXEMPT_PATH_PATTERNS = [
    /\/ghost\/api(?:\/|$)/,
    /\/\.ghost(?:\/|$)/,
    /\/\.well-known(?:\/|$)/,
    /\/socket\.io(?:\/|$)/
];

type FilterResult = {
    requestTarget: string;
    removedUnknownParameters: string[];
};

const splitRequestTarget = (requestTarget: string) => {
    const queryStart = requestTarget.indexOf('?');

    if (queryStart === -1) {
        return {pathname: requestTarget, searchParams: new URLSearchParams()};
    }

    return {
        pathname: requestTarget.slice(0, queryStart),
        searchParams: new URLSearchParams(requestTarget.slice(queryStart + 1))
    };
};

const removeUnknownParameters = (searchParams: URLSearchParams, allowlist: ReadonlySet<string>) => {
    const removed = new Set<string>();

    for (const parameter of [...searchParams.keys()]) {
        if (!allowlist.has(parameter)) {
            searchParams.delete(parameter);
            removed.add(parameter);
        }
    }

    return removed;
};

const filterRequestTarget = (requestTarget: string): FilterResult => {
    const {pathname, searchParams} = splitRequestTarget(requestTarget);
    const contentApiRequest = CONTENT_API_PATH_PATTERN.test(pathname);
    const bypass = searchParams.get('force_params') === 'true';
    const exemptPath = EXEMPT_PATH_PATTERNS.some(pattern => pattern.test(pathname));

    if (!contentApiRequest && (bypass || exemptPath)) {
        return {
            requestTarget,
            removedUnknownParameters: []
        };
    }

    const allowlist = contentApiRequest ? allowedContentApiQueryParameters : allowedQueryParameters;
    const removedUnknownParameters = removeUnknownParameters(searchParams, allowlist);

    if (removedUnknownParameters.size === 0) {
        return {
            requestTarget,
            removedUnknownParameters: []
        };
    }

    const query = searchParams.toString();

    return {
        requestTarget: query ? `${pathname}?${query}` : pathname,
        removedUnknownParameters: [...removedUnknownParameters].sort()
    };
};

/**
 * Applies Ghost(Pro)'s public query parameter allowlist in local development.
 *
 * Keep query-parameter-allowlist.ts in sync with:
 * - TryGhost/terraform modules/ghost-fastly/variables.tf
 * - TryGhost/pro-infra infrastructure/fastly/vcl/shared/recv_100_clean_query_string.vcl.tftpl
 *
 * Update the production policy and this manifest together when adding a parameter.
 * This middleware is enabled by the root pnpm dev Docker Compose configuration.
 */
function filterQueryParameters(req: Request, _res: Response, next: NextFunction) {
    const requestTarget = req.originalUrl || req.url;
    const result = filterRequestTarget(requestTarget);

    if (result.requestTarget !== requestTarget) {
        req.originalUrl = result.requestTarget;
        req.url = result.requestTarget;
        req.query = {...querystring.parse(result.requestTarget.split('?')[1] || '')};
    }

    if (result.removedUnknownParameters.length > 0) {
        const strippedParameters = result.removedUnknownParameters.map(encodeURIComponent).join(', ');
        logging.warn(`[query-parameter-filter] Stripped undeclared query parameter(s) from ${req.path}: ${strippedParameters}`);
    }

    next();
}

export default Object.assign(filterQueryParameters, {filterRequestTarget});
