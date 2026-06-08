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
        // React Router's hash routes don't match a trailing slash. Strip one
        // from the pathname only — slashes inside the query string (e.g.
        // `?next=/settings/`) must be preserved.
        const captured = ghostPathMatch[1];
        const queryIndex = captured.indexOf('?');
        const pathname = queryIndex === -1 ? captured : captured.slice(0, queryIndex);
        const query = queryIndex === -1 ? '' : captured.slice(queryIndex);
        const hashPath = pathname.replace(/\/$/, '') + query;

        return res.redirect(urlUtils.urlJoin(urlUtils.urlFor('admin'), '#', hashPath));
    }

    next();
}

module.exports = redirectAdminUrls;
