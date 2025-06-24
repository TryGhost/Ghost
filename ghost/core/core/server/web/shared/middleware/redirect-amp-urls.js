const urlUtils = require('../../../../shared/url-utils');
const localUtils = require('../utils');

/**
 * redirectAmpUrls middleware
 *
 * 1. Detect requests whose path ends with `/amp/` (case-insensitive) or `/amp` before a query-string
 * 2. Issue a 301 redirect to the same URL without that suffix, preserving the query string.
 *
 * Needs to sit early in the public-site middleware stack so that the request never reaches
 * the dynamic routers or results in a 404.
 *
 * Example:
 *   /welcome/amp/      -> /welcome/
 *   /welcome/amp/?q=1  -> /welcome/?q=1
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object  
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
function redirectAmpUrls(req, res, next) {
    const ampPattern = /\/amp\/?$/i;
    const url = new URL(req.url, 'http://example.com');
    
    if (!ampPattern.test(url.pathname)) {
        return next();
    }

    const sanitizedPath = url.pathname.replace(ampPattern, '/') + url.search;
    const redirectPath = localUtils.removeOpenRedirectFromUrl(sanitizedPath);

    return urlUtils.redirect301(res, redirectPath);
}

module.exports = redirectAmpUrls; 