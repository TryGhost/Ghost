const crypto = require('crypto');

/**
 * @TODO: move this middleware to Framework monorepo?
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = function requestIdMw(req, res, next) {
    const requestId = req.get('X-Request-ID') || crypto.randomUUID();

    // Set a value for internal use
    req.requestId = requestId;

    // If the header was set on the request, return it on the response
    if (req.get('X-Request-ID')) {
        res.set('X-Request-ID', requestId);
    }

    next();
};
