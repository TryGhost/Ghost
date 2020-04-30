const models = require('../../../models');
const errors = require('@tryghost/errors');
const {i18n} = require('../../../lib/common');

const authenticateContentApiKey = function authenticateContentApiKey(req, res, next) {
    // allow fallthrough to other auth methods or final ensureAuthenticated check
    if (!req.query || !req.query.key) {
        return next();
    }

    if (req.query.key.constructor === Array) {
        return next(new errors.BadRequestError({
            message: i18n.t('errors.middleware.auth.invalidRequest'),
            code: 'INVALID_REQUEST'
        }));
    }

    let key = req.query.key;

    models.ApiKey.findOne({secret: key}).then((apiKey) => {
        if (!apiKey) {
            return next(new errors.UnauthorizedError({
                message: i18n.t('errors.middleware.auth.unknownContentApiKey'),
                code: 'UNKNOWN_CONTENT_API_KEY'
            }));
        }

        if (apiKey.get('type') !== 'content') {
            return next(new errors.UnauthorizedError({
                message: i18n.t('errors.middleware.auth.invalidApiKeyType'),
                code: 'INVALID_API_KEY_TYPE'
            }));
        }

        // authenticated OK, store the api key on the request for later checks and logging
        req.api_key = apiKey;
        next();
    }).catch((err) => {
        next(new errors.InternalServerError({err}));
    });
};

module.exports = {
    authenticateContentApiKey
};
