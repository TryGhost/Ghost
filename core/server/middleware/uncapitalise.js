// # uncapitalise Middleware
// Usage: uncapitalise(req, res, next)
// After:
// Before:
// App: Admin|Site|API
//
// Detect upper case in req.path.
//
//  Example req:
//  req.originalUrl = /blog/ghost/signin/?asdAD=asdAS
//  req.url = /ghost/signin/?asdAD=asdAS
//  req.baseUrl = /blog
//  req.path =  /ghost/signin/

var utils = require('../utils'),
    uncapitalise;

uncapitalise = function uncapitalise(req, res, next) {
    var pathToTest = (req.baseUrl ? req.baseUrl : '') + req.path,
        isSignupOrReset = pathToTest.match(/^(.*\/ghost\/(signup|reset)\/)/i),
        isAPI = pathToTest.match(/^(.*\/ghost\/api\/v[\d\.]+\/.*?\/)/i),
        redirectPath;

    if (isSignupOrReset) {
        pathToTest = isSignupOrReset[1];
    }

    // Do not lowercase anything after /api/v0.1/ to protect :key/:slug
    if (isAPI) {
        pathToTest = isAPI[1];
    }

    /**
     * In node < 0.11.1 req.path is not encoded, afterwards, it is always encoded such that | becomes %7C etc.
     * That encoding isn't useful here, as it triggers an extra uncapitalise redirect, so we decode the path first
     */
    if (/[A-Z]/.test(decodeURIComponent(pathToTest))) {
        redirectPath = (
            utils.removeOpenRedirectFromUrl((req.originalUrl || req.url).replace(pathToTest, pathToTest.toLowerCase()))
        );

        return utils.url.redirect301(res, redirectPath);
    }

    next();
};

module.exports = uncapitalise;
