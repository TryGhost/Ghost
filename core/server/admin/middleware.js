var utils = require('../utils');

function redirectAdminUrls(req, res, next) {
    var subdir = utils.url.getSubdir(),
        ghostPathRegex = new RegExp('^' + subdir + '/ghost/(.+)'),
        ghostPathMatch = req.originalUrl.match(ghostPathRegex);

    if (ghostPathMatch) {
        return res.redirect(utils.url.urlJoin(utils.url.urlFor('admin'), '#', ghostPathMatch[1]));
    }

    next();
}

module.exports = [
    redirectAdminUrls
];
