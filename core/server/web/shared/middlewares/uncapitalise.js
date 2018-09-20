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

const urlService = require('../../../services/url');
const common = require('../../../lib/common');
const localUtils = require('../utils');

const uncapitalise = (req, res, next) => {
    let pathToTest = (req.baseUrl ? req.baseUrl : '') + req.path;
    let redirectPath;
    let decodedURI;

    const isSignupOrReset = pathToTest.match(/^(.*\/ghost\/(signup|reset)\/)/i),
        isAPI = pathToTest.match(/^(.*\/ghost\/api\/v[\d.]+\/.*?\/)/i);

    if (isSignupOrReset) {
        pathToTest = isSignupOrReset[1];
    }

    // Do not lowercase anything after e.g. /api/v0.1/ to protect :key/:slug
    if (isAPI) {
        pathToTest = isAPI[1];
    }

    try {
        decodedURI = decodeURIComponent(pathToTest);
    } catch (err) {
        return next(new common.errors.NotFoundError({
            message: common.i18n.t('errors.errors.pageNotFound'),
            err: err
        }));
    }

    /**
     * In node < 0.11.1 req.path is not encoded, afterwards, it is always encoded such that | becomes %7C etc.
     * That encoding isn't useful here, as it triggers an extra uncapitalise redirect, so we decode the path first
     */
    if (/[A-Z]/.test(decodedURI)) {
        redirectPath = (localUtils.removeOpenRedirectFromUrl((req.originalUrl || req.url).replace(pathToTest, pathToTest.toLowerCase())));
        return urlService.utils.redirect301(res, redirectPath);
    }

    next();
};

module.exports = uncapitalise;
