const logging = require('@tryghost/logging');
const querystring = require('node:querystring');
const allowedQueryParameters = new Set(require('./query-parameter-allowlist.json'));

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

const removeUnknownParameters = (searchParams) => {
    const removed = new Set();

    for (const parameter of [...searchParams.keys()]) {
        if (!allowedQueryParameters.has(parameter)) {
            searchParams.delete(parameter);
            removed.add(parameter);
        }
    }

    return removed;
};

const filterRequestTarget = (requestTarget) => {
    const {pathname, searchParams} = splitRequestTarget(requestTarget);
    const bypass = searchParams.get('force_params') === 'true';
    const exemptPath = EXEMPT_PATH_PATTERNS.some(pattern => pattern.test(pathname));

    if (bypass || exemptPath) {
        return {
            requestTarget,
            removedUnknownParameters: []
        };
    }

    const removedUnknownParameters = removeUnknownParameters(searchParams);
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
 * Keep query-parameter-allowlist.json in sync with:
 * - TryGhost/terraform modules/ghost-fastly/variables.tf
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
