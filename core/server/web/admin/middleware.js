const urlUtils = require('../../lib/url-utils');

function redirectAdminUrls(req, res, next) {
    const subdir = urlUtils.getSubdir(),
        ghostPathRegex = new RegExp(`^${subdir}/ghost/(.+)`),
        ghostPathMatch = req.originalUrl.match(ghostPathRegex);

    if (ghostPathMatch) {
        return res.redirect(urlUtils.urlJoin(urlUtils.urlFor('admin'), '#', ghostPathMatch[1]));
    }

    next();
}

module.exports = [
    redirectAdminUrls
];
