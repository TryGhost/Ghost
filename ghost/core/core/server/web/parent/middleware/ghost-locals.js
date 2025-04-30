const ghostVersion = require('@tryghost/version');

/**
 * Expose the standard locals that every request will need to have available
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = function ghostLocals(req, res, next) {
    // Make sure we have a locals value.
    res.locals = res.locals || {};
    // The current Ghost version
    res.locals.version = ghostVersion.full;
    // The current Ghost version, but only major.minor
    res.locals.safeVersion = ghostVersion.safe;
    // relative path from the URL
    res.locals.relativeUrl = req.path;

    next();
};
