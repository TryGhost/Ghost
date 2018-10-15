const models = require('../../../models');
const common = require('../../../lib/common');

const authenticateContentApiKey = function authenticateContentApiKey(req, res, next) {
    // allow fallthrough to other auth methods or final ensureAuthenticated check
    if (!req.query || !req.query.key) {
        return next();
    }

    let key = req.query.key;

    models.ApiKey.findOne({secret: key}).then((apiKey) => {
        if (!apiKey) {
            return next(new common.errors.UnauthorizedError({
                message: common.i18n.t('errors.middleware.auth.unknownContentApiKey'),
                code: 'UNKNOWN_CONTENT_API_KEY'
            }));
        }

        if (apiKey.get('type') !== 'content') {
            return next(new common.errors.UnauthorizedError({
                message: common.i18n.t('errors.middleware.auth.invalidApiKeyType'),
                code: 'INVALID_API_KEY_TYPE'
            }));
        }

        // authenticated OK, store the api key on the request for later checks and logging
        req.api_key = apiKey;
        next();
    }).catch((err) => {
        next(new common.errors.InternalServerError({err}));
    });
};

module.exports = {
    authenticateContentApiKey
};
