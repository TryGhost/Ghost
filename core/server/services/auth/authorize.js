const labs = require('../labs');
const common = require('../../lib/common');

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
