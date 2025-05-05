/**
 * Middleware to extract locale from the URL prefix (e.g., /en/about)
 * Sets res.locals.locale and strips the prefix from req.url for downstream routing.
 */
module.exports = function localeFromUrl(req, res, next) {
    const match = req.path.match(/^\/([a-z]{2})(\/|$)/);
    if (match) {
        res.locals.locale = match[1];
        console.log('===== set locale to ', res.locals.locale);
        // Remove the locale prefix for downstream routing
        req.url = req.url.replace(/^\/[a-z]{2}/, '') || '/';
    } else {
        res.locals.locale = 'en'; // fallback/default
        console.log('===== set locale to ', res.locals.locale);
    }
    next();
};