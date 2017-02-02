var api    = require('../api'),
    utils = require('../utils');

// Redirect to setup if no user exists
function redirectToSetup(req, res, next) {
    var isSetupRequest = req.path.match(/\/setup\//),
        isOauthAuthorization = req.path.match(/\/$/) && req.query && (req.query.code || req.query.error);

    api.authentication.isSetup().then(function then(exists) {
        if (!exists.setup[0].status && !isSetupRequest && !isOauthAuthorization) {
            return res.redirect(utils.url.urlJoin(utils.url.urlFor('admin') + 'setup/'));
        }
        next();
    }).catch(function handleError(err) {
        return next(new Error(err));
    });
}

module.exports = redirectToSetup;
