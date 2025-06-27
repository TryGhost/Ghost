const config = require('../../../../shared/config');

// Prior to Ghost 6.x we allowed any limit value, including 'all', but as sites
// grew in size it led to performance issues and mis-use of the API.

// After Ghost 6.x we only allow a max limit of 100. This middleware enforces
// that limit by rewriting the limit parameter before it reaches any API code.

const limitConfig = {
    allowLimitAll: config.get('optimization:allowLimitAll') || false,
    maxLimit: config.get('optimization:maxLimit') || 100,
    // Temporary exceptions to the max limit rule
    exceptionEndpoints: [
        '/ghost/api/admin/posts/export/',
        '/ghost/api/admin/emails/' // /:id/batches/ and /:id/recipient-failures/
    ]
};

function maxLimitCap(req, res, next) {
    const limit = req.query.limit;

    if (!limit) {
        return next();
    }

    // If 'all' is globally allowed, skip everything else
    if (limit === 'all' && limitConfig.allowLimitAll) {
        return next();
    }

    // Check exception endpoints - they bypass all limits
    if (limitConfig.exceptionEndpoints.some(endpoint => req.originalUrl.startsWith(endpoint))) {
        return next();
    }

    // Special case: 'all' should be capped to maxLimit
    if (limit === 'all') {
        req.query.limit = limitConfig.maxLimit;
        return next();
    }

    // Convert to number for comparison
    const numericLimit = parseInt(limit, 10);

    // If it's not a valid number or exceeds maxLimit, cap it
    if (isNaN(numericLimit) || numericLimit > limitConfig.maxLimit) {
        req.query.limit = limitConfig.maxLimit;
    }

    next();
}

// Create middleware stack with limitConfig property for test access
/** @type {Array<Function> & {limitConfig: object}} */
const middlewareStack = Object.assign([maxLimitCap], {limitConfig});

module.exports = middlewareStack;
