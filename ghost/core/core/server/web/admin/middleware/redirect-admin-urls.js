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
        return res.redirect(urlUtils.urlJoin(urlUtils.urlFor('admin'), '#', ghostPathMatch[1]));
    }

    next();
}

module.exports = redirectAdminUrls;
