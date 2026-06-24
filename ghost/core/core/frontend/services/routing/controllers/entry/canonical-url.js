const url = require('url');

/**
 * Build the entry's canonical URL (its own pathname) carrying over the current
 * request's query string. Shared by the permalink and markdown-url redirects.
 *
 * @param {Object} req
 * @param {Object} entry
 * @returns {string}
 */
module.exports = function buildCanonicalUrl(req, entry) {
    return url.format({
        pathname: url.parse(entry.url).pathname,
        search: url.parse(req.originalUrl).search
    });
};
