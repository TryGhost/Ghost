const labs = require('../labs');
const common = require('../../lib/common');

const authorize = {
    // Workaround for missing permissions
    // TODO: rework when https://github.com/TryGhost/Ghost/issues/3911 is  done
    requiresAuthorizedUser: function requiresAuthorizedUser(req, res, next) {
        if (req.user && req.user.id) {
            return next();
        } else {
            return next(new common.errors.NoPermissionError({
                message: common.i18n.t('errors.middleware.auth.pleaseSignIn')
            }));
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
                // CASE: has no user access and public api is disabled
                if (labs.isSet('publicAPI') !== true) {
                    return next(new common.errors.NoPermissionError({
                        message: common.i18n.t('errors.middleware.auth.publicAPIDisabled.error'),
                        context: common.i18n.t('errors.middleware.auth.publicAPIDisabled.context'),
                        help: common.i18n.t('errors.middleware.auth.forInformationRead', {url: 'https://docs.ghost.org/api/content/'})
                    }));
                }

                return next(new common.errors.NoPermissionError({
                    message: common.i18n.t('errors.middleware.auth.pleaseSignIn')
                }));
            }
        }
    },

    // Requires the authenticated client to match specific client
    requiresAuthorizedClient: function requiresAuthorizedClient(client) {
        return function doAuthorizedClient(req, res, next) {
            if (client && (!req.client || !req.client.name || req.client.name !== client)) {
                return next(new common.errors.NoPermissionError({
                    message: common.i18n.t('errors.permissions.noPermissionToAction')
                }));
            }

            return next();
        };
    },

    authorizeContentApi(req, res, next) {
        const hasApiKey = req.api_key && req.api_key.id;
        const hasMember = req.member;
        if (hasApiKey) {
            return next();
        }
        if (labs.isSet('members') && hasMember) {
            return next();
        }
        return next(new common.errors.NoPermissionError({
            message: common.i18n.t('errors.middleware.auth.authorizationFailed'),
            context: common.i18n.t('errors.middleware.auth.missingContentMemberOrIntegration')
        }));
    },

    authorizeAdminApi(req, res, next) {
        const hasUser = req.user && req.user.id;
        const hasApiKey = req.api_key && req.api_key.id;

        if (hasUser || hasApiKey) {
            return next();
        } else {
            return next(new common.errors.NoPermissionError({
                message: common.i18n.t('errors.middleware.auth.authorizationFailed'),
                context: common.i18n.t('errors.middleware.auth.missingAdminUserOrIntegration')
            }));
        }
    }
};

module.exports = authorize;
