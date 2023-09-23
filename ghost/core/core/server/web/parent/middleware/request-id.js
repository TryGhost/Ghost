const uuid = require('uuid');

/**
 * @TODO: move this middleware to Framework monorepo?
 */
module.exports = function requestIdMw(req, res, next) {
    const requestId = req.get('X-Request-ID') || uuid.v4();

    // Set a value for internal use
    req.requestId = requestId;

    // If the header was set on the request, return it on the response
    if (req.get('X-Request-ID')) {
        res.set('X-Request-ID', requestId);
    }

    next();
};
