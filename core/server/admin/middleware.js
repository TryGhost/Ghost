var utils = require('../utils');

function redirectAdminUrls(req, res, next) {
    var ghostPathMatch = req.originalUrl.match(/^\/ghost\/(.+)$/);
    if (ghostPathMatch) {
        return res.redirect(utils.url.urlJoin(utils.url.urlFor('admin'), '#', ghostPathMatch[1]));
    }

    next();
}

module.exports = [
    redirectAdminUrls
];
