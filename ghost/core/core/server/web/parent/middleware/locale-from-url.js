/**
 * Middleware to extract locale from the URL prefix (e.g., /en/about)
 * Sets res.locals.locale and strips the prefix from req.url for downstream routing.
 */
module.exports = function localeFromUrl(req, res, next) {
    const match = req.path.match(/^\/([a-z]{2})(\/|$)/);
    if (match) {
        res.locals.locale = match[1];
        // Remove the locale prefix for downstream routing
        req.url = req.url.replace(/^\/[a-z]{2}/, '') || '/';
    } else {
        // no locale detected, not setting a default here so that we can use the site's configured locale
    }
    next();
};