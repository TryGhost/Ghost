const models = require('../../../models');
const {
    BadRequestError,
    UnauthorizedError
} = require('../../../lib/common/errors');

const authenticateContentApiKey = function authenticateContentApiKey(req, res, next) {
    if (req.headers && req.headers.authorization) {
        return next(new BadRequestError({
            message: 'Content API does not support header authentication',
            code: 'INVALID_AUTH_TYPE'
        }));
    }

    // allow fallthrough to other auth methods or final ensureAuthenticated check
    if (!req.query || !req.query.content_key) {
        return next();
    }

    let key = req.query.content_key;

    models.ApiKey.findOne({secret: key}).then((apiKey) => {
        if (!apiKey) {
            return next(new UnauthorizedError({
                message: 'Unknown Content API Key',
                code: 'UNKNOWN_CONTENT_API_KEY'
            }));
        }

        // TODO: extra messaging in case Admin secret was exposed?
        if (apiKey.get('type') !== 'content') {
            return next(new UnauthorizedError({
                message: 'Incorrect API Key type',
                code: 'INCORRECT_API_KEY_TYPE'
            }));
        }

        // authenticated OK, store the api key on the request for later checks and logging
        req.api_key = apiKey;
        next();
    });
};

module.exports = {
    authenticateContentApiKey
};
