const urlUtils = require('../../../../shared/url-utils');

/**
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function redirectAdminUrls(req, res, next) {
    const subdir = urlUtils.getSubdir();
    const ghostPathRegex = new RegExp(`^${subdir}/ghost/(.+)`);
    const ghostPathMatch = req.originalUrl.match(ghostPathRegex);

    if (ghostPathMatch) {
        // React Router's hash routes don't match a trailing slash, so strip one
        // if present (immediately before the query string or at the end of the
        // path) before building the redirect target.
        const hashPath = ghostPathMatch[1].replace(/\/(\?|$)/, '$1');
        return res.redirect(urlUtils.urlJoin(urlUtils.urlFor('admin'), '#', hashPath));
    }

    next();
}

module.exports = redirectAdminUrls;
