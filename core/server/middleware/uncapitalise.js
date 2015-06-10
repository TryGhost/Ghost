// # uncapitalise Middleware
// Usage: uncapitalise(req, res, next)
// After:
// Before:
// App: Admin|Blog|API
//
// Detect upper case in req.path.

var utils = require('../utils'),
    uncapitalise;

uncapitalise = function uncapitalise(req, res, next) {
    /*jslint unparam:true*/
    var pathToTest = req.path,
        isSignupOrReset = req.path.match(/(\/ghost\/(signup|reset)\/)/i),
        isAPI = req.path.match(/(\/ghost\/api\/v[\d\.]+\/.*?\/)/i);

    if (isSignupOrReset) {
        pathToTest = isSignupOrReset[1];
    }

    // Do not lowercase anything after /api/v0.1/ to protect :key/:slug
    if (isAPI) {
        pathToTest = isAPI[1];
    }

    if (/[A-Z]/.test(pathToTest)) {
        res.set('Cache-Control', 'public, max-age=' + utils.ONE_YEAR_S);
        res.redirect(301, req.url.replace(pathToTest, pathToTest.toLowerCase()));
    } else {
        next();
    }
};

module.exports = uncapitalise;
