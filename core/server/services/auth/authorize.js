var labs = require('../labs'),
    common = require('../../lib/common'),
    authorize;

authorize = {
    // Workaround for missing permissions
    // TODO: rework when https://github.com/TryGhost/Ghost/issues/3911 is  done
    requiresAuthorizedUser: function requiresAuthorizedUser(req, res, next) {
        if (req.user && req.user.id) {
            return next();
        } else {
            return next(new common.errors.NoPermissionError({message: common.i18n.t('errors.middleware.auth.pleaseSignIn')}));
        }
    },

    // used by Admin API v2 endpoints
    requiresAuthorizedUserOrApiKey(req, res, next) {
        const hasUser = req.user && req.user.id;
        const hasApiKey = req.api_key && req.api_key.id;
        if (hasUser || hasApiKey) {
            return next();
        } else {
            return next(new common.errors.NoPermissionError({message: common.i18n.t('errors.middleware.auth.pleaseSignInOrAuthenticate')}));
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
                return next(new common.errors.NoPermissionError({message: common.i18n.t('errors.middleware.auth.pleaseSignIn')}));
            }
        }
    },

    // Requires the authenticated client to match specific client
    requiresAuthorizedClient: function requiresAuthorizedClient(client) {
        return function doAuthorizedClient(req, res, next) {
            if (client && (!req.client || !req.client.name || req.client.name !== client)) {
                return next(new common.errors.NoPermissionError({message: common.i18n.t('errors.permissions.noPermissionToAction')}));
            }

            return next();
        };
    }
};

module.exports = authorize;
