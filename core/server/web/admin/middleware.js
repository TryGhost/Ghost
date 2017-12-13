var urlService = require('../../services/url');

function redirectAdminUrls(req, res, next) {
    var subdir = urlService.utils.getSubdir(),
        ghostPathRegex = new RegExp('^' + subdir + '/ghost/(.+)'),
        ghostPathMatch = req.originalUrl.match(ghostPathRegex);

    if (ghostPathMatch) {
        return res.redirect(urlService.utils.urlJoin(urlService.utils.urlFor('admin'), '#', ghostPathMatch[1]));
    }

    next();
}

module.exports = [
    redirectAdminUrls
];
