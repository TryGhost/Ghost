const models = require('../../../models');
const {
    UnauthorizedError
} = require('../../../lib/common/errors');

const extractCredentialsFromQuery = function extractCredentialsFromQuery(query) {
    let [apiKeyId, token] = query.split('|');

    return {
        apiKeyId,
        token
    };
};

const authenticateContentAPIKey = function authenticateContentAPIKey(req, res, next) {
    // allow fallthrough to other auth methods or final ensureAuthenticated check
    if (!req.query || !req.query.content_key) {
        return next();
    }

    if (req.headers && req.headers.authorization) {
        return next(new UnauthorizedError({
            message: 'Content API does not support header authentication',
            code: 'INVALID_AUTH_TYPE'
        }));
    }

    let {apiKeyId, token} = extractCredentialsFromQuery(req.query.content_key);

    if (!apiKeyId || !token) {
        return next(new UnauthorizedError({
            message: 'Content API auth format is "?content_key=[api key id]|[token]"',
            code: 'INVALID_AUTH_PARAM'
        }));
    }

    models.ApiKey.findOne({id: apiKeyId}).then((apiKey) => {
        if (!apiKey || token !== apiKey.get('secret')) {
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
    authenticateContentAPIKey
};
