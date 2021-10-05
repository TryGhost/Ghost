const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    authorizationFailed: 'Authorization failed',
    missingContentMemberOrIntegration: 'Unable to determine the authenticated member or integration. Check the supplied Content API Key and ensure cookies are being passed through if member auth is failing.',
    missingAdminUserOrIntegration: 'Unable to determine the authenticated user or integration. Check that cookies are being passed through if using session authentication.'
};

const authorize = {
    authorizeContentApi(req, res, next) {
        const hasApiKey = req.api_key && req.api_key.id;
        const hasMember = req.member;
        if (hasApiKey) {
            return next();
        }
        if (hasMember) {
            return next();
        }
        return next(new errors.NoPermissionError({
            message: tpl(messages.authorizationFailed),
            context: tpl(messages.missingContentMemberOrIntegration)
        }));
    },

    authorizeAdminApi(req, res, next) {
        const hasUser = req.user && req.user.id;
        const hasApiKey = req.api_key && req.api_key.id;

        if (hasUser || hasApiKey) {
            return next();
        } else {
            return next(new errors.NoPermissionError({
                message: tpl(messages.authorizationFailed),
                context: tpl(messages.missingAdminUserOrIntegration)
            }));
        }
    }
};

module.exports = authorize;
