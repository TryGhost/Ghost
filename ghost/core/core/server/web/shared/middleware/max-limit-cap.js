const {applyLimitCap, limitConfig} = require('../../../../shared/max-limit-cap');

// Prior to Ghost 6.x we allowed any limit value, including 'all', but as sites
// grew in size it led to performance issues and mis-use of the API.

// After Ghost 6.x we only allow a max limit of 100. This middleware enforces
// that limit by rewriting the limit parameter before it reaches any API code.

function maxLimitCap(req, res, next) {
    const limit = req.query.limit;

    if (!limit) {
        return next();
    }

    // Apply the shared limit capping logic with URL for exception endpoint checking
    const cappedLimit = applyLimitCap(limit, {url: req.originalUrl});

    req.query.limit = cappedLimit;
    next();
}

// Create middleware stack with limitConfig property for test access
/** @type {Array<Function> & {limitConfig: object}} */
const middlewareStack = Object.assign([maxLimitCap], {limitConfig});

module.exports = middlewareStack;
