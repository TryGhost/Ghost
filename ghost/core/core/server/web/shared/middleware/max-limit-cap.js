const config = require('../../../../shared/config');

// Prior to Ghost 6.x we allowed any limit value, including 'all', but as sites
// grew in size it led to performance issues and mis-use of the API.

// After Ghost 6.x we only allow a max limit of 100. This middleware enforces
// that limit by rewriting the limit parameter before it reaches any API code.

// Temporary exceptions to the max limit rule
const EXCEPTION_ENDPOINTS = [
    '/ghost/api/admin/posts/export/',
    '/ghost/api/admin/emails/' // /:id/batches/ and /:id/recipient-failures/
];

const allowLimitAll = config.get('optimization:allowLimitAll') || false;
const maxLimit = config.get('optimization:maxLimit') || 100;

function maxLimitCap(req, res, next) {
    const limit = req.query.limit;

    if (!limit) {
        return next();
    }

    // If 'all' is globally allowed, skip everything else
    if (limit === 'all' && allowLimitAll) {
        return next();
    }

    // Check exception endpoints - they bypass all limits
    if (EXCEPTION_ENDPOINTS.some(endpoint => req.originalUrl.startsWith(endpoint))) {
        return next();
    }

    // Special case: 'all' should be capped to maxLimit
    if (limit === 'all') {
        req.query.limit = maxLimit;
        return next();
    }

    // Convert to number for comparison
    const numericLimit = parseInt(limit, 10);

    // If it's not a valid number or exceeds maxLimit, cap it
    if (isNaN(numericLimit) || numericLimit > maxLimit) {
        req.query.limit = maxLimit;
    }

    next();
}

module.exports = [
    maxLimitCap
];
