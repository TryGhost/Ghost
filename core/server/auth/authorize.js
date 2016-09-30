var errors = require('../errors'),
    labs = require('../utils/labs'),
    i18n = require('../i18n'),
    authorize;

authorize = {
    // Workaround for missing permissions
    // TODO: rework when https://github.com/TryGhost/Ghost/issues/3911 is  done
    requiresAuthorizedUser: function requiresAuthorizedUser(req, res, next) {
        if (req.user && req.user.id) {
            return next();
        } else {
            return errors.handleAPIError(new errors.NoPermissionError(i18n.t('errors.middleware.auth.pleaseSignIn')), req, res, next);
        }
    },

    // ### Require user depending on public API being activated.
    requiresAuthorizedUserPublicAPI: function requiresAuthorizedUserPublicAPI(req, res, next) {
        if (labs.isSet('publicAPI') === true) {
            return next();
        } else {
            if (req.user && req.user.id) {
                return next();
            } else {
                return errors.handleAPIError(new errors.NoPermissionError(i18n.t('errors.middleware.auth.pleaseSignIn')), req, res, next);
            }
        }
    }
};

module.exports = authorize;
