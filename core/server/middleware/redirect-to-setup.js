var api    = require('../api'),
    config = require('../config');

// Redirect to setup if no user exists
function redirectToSetup(req, res, next) {
    api.authentication.isSetup().then(function then(exists) {
        if (!exists.setup[0].status && !req.path.match(/\/setup\//)) {
            return res.redirect(config.paths.subdir + '/ghost/setup/');
        }
        next();
    }).catch(function handleError(err) {
        return next(new Error(err));
    });
}

module.exports = redirectToSetup;
