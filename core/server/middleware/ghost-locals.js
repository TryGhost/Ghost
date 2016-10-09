var config = require('../config');

// ### GhostLocals Middleware
// Expose the standard locals that every external page should have available,
// separating between the theme and the admin
module.exports = function ghostLocals(req, res, next) {
    // Make sure we have a locals value.
    res.locals = res.locals || {};
    res.locals.version = config.get('ghostVersion');
    res.locals.safeVersion = config.get('ghostVersion').match(/^(\d+\.)?(\d+)/)[0];
    // relative path from the URL
    res.locals.relativeUrl = req.path;

    next();
};
