const labs = require('../labs');
const errors = require('@tryghost/errors');
const {i18n} = require('../../lib/common');

const authorize = {
    authorizeContentApi(req, res, next) {
        const hasApiKey = req.api_key && req.api_key.id;
        const hasMember = req.member;
        if (hasApiKey) {
            return next();
        }
        if (labs.isSet('members') && hasMember) {
            return next();
        }
        return next(new errors.NoPermissionError({
            message: i18n.t('errors.middleware.auth.authorizationFailed'),
            context: i18n.t('errors.middleware.auth.missingContentMemberOrIntegration')
        }));
    },

    authorizeAdminApi(req, res, next) {
        const hasUser = req.user && req.user.id;
        const hasApiKey = req.api_key && req.api_key.id;

        if (hasUser || hasApiKey) {
            return next();
        } else {
            return next(new errors.NoPermissionError({
                message: i18n.t('errors.middleware.auth.authorizationFailed'),
                context: i18n.t('errors.middleware.auth.missingAdminUserOrIntegration')
            }));
        }
    }
};

module.exports = authorize;
