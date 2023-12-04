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

const errors = require('@tryghost/errors');
const urlUtils = require('../../../../shared/url-utils');
const tpl = require('@tryghost/tpl');
const localUtils = require('../utils');

const messages = {
    pageNotFound: 'Page not found"'
};

const uncapitalise = function uncapitalise(req, res, next) {
    let pathToTest = (req.baseUrl ? req.baseUrl : '') + req.path;
    let redirectPath;
    let decodedURI;

    const isSignupOrReset = pathToTest.match(/^(.*\/ghost\/(signup|reset)\/)/i);
    const isAPIRegExp = new RegExp(`^(.*${urlUtils.BASE_API_PATH}(/(v[\\d.]+|canary))?/.*?/)`, 'i');
    const isAPI = pathToTest.match(isAPIRegExp);

    if (isSignupOrReset) {
        pathToTest = isSignupOrReset[1];
    }

    // Do not lowercase anything after e.g. /ghost/api(/v{X})?/ to protect :key/:slug
    if (isAPI) {
        pathToTest = isAPI[1];
    }

    try {
        decodedURI = decodeURIComponent(pathToTest);
    } catch (err) {
        return next(new errors.NotFoundError({
            message: tpl(messages.pageNotFound),
            err: err
        }));
    }

    /**
     * In node < 0.11.1 req.path is not encoded, afterwards, it is always encoded such that | becomes %7C etc.
     * That encoding isn't useful here, as it triggers an extra uncapitalise redirect, so we decode the path first
     */
    if (/[A-Z]/.test(decodedURI)) {
        redirectPath = (localUtils.removeOpenRedirectFromUrl((req.originalUrl || req.url).replace(pathToTest, pathToTest.toLowerCase())));
        return urlUtils.redirect301(res, redirectPath);
    }

    next();
};

module.exports = uncapitalise;
