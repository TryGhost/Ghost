const logging = require('@tryghost/logging');
const querystring = require('node:querystring');
const {
    CONTENT_API_QUERY_PARAMETER_ALLOWLIST,
    QUERY_PARAMETER_ALLOWLIST
} = require('./query-parameter-allowlist');

const allowedQueryParameters = new Set(QUERY_PARAMETER_ALLOWLIST);
const allowedContentApiQueryParameters = new Set(CONTENT_API_QUERY_PARAMETER_ALLOWLIST);

const CONTENT_API_PATH_PATTERN = /\/ghost\/api\/(?:(?:v[0-9]+|canary)\/content|content)(?:\/|$)/;

const EXEMPT_PATH_PATTERNS = [
    /\/ghost\/api(?:\/|$)/,
    /\/\.ghost(?:\/|$)/,
    /\/\.well-known(?:\/|$)/,
    /\/socket\.io(?:\/|$)/
];

const splitRequestTarget = (requestTarget) => {
    const queryStart = requestTarget.indexOf('?');

    if (queryStart === -1) {
        return {pathname: requestTarget, searchParams: new URLSearchParams()};
    }

    return {
        pathname: requestTarget.slice(0, queryStart),
        searchParams: new URLSearchParams(requestTarget.slice(queryStart + 1))
    };
};

const removeUnknownParameters = (searchParams, allowlist) => {
    const removed = new Set();

    for (const parameter of [...searchParams.keys()]) {
        if (!allowlist.has(parameter)) {
            searchParams.delete(parameter);
            removed.add(parameter);
        }
    }

    return removed;
};

const filterRequestTarget = (requestTarget) => {
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
    searchParams.sort();
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
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = function filterQueryParameters(req, res, next) {
    const result = filterRequestTarget(req.originalUrl || req.url);

    req.originalUrl = result.requestTarget;
    req.url = result.requestTarget;
    req.query = querystring.parse(result.requestTarget.split('?')[1] || '');

    if (result.removedUnknownParameters.length > 0) {
        const strippedParameters = result.removedUnknownParameters.map(encodeURIComponent).join(', ');
        res.setHeader('X-Ghost-Dev-Stripped-Query-Parameters', strippedParameters);
        logging.warn(`[query-parameter-filter] Stripped undeclared query parameter(s) from ${req.path}: ${strippedParameters}`);
    }

    next();
};

module.exports.filterRequestTarget = filterRequestTarget;
