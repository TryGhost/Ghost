const jwt = require('jsonwebtoken');
const models = require('../../../models');
const {
    InternalServerError,
    UnauthorizedError
} = require('../../../lib/common/errors');

const JWT_OPTIONS = {
    maxAge: '5m',
    algorithms: ['HS256']
};

/**
 * Remove 'Bearer' from raw authorization header and extract the API Key ID and
 * JWT token. Eg. Authorization: Bearer ${objectId}:${JWT}
 * @param {string} header
 */
const extractCredentialsFromHeader = function extractCredentialsFromHeader(header) {
    let [scheme, credentials] = header.split(' ');

    if (/^Bearer$/i.test(scheme)) {
        let [apiKeyId, token] = credentials.split('|');

        return {
            apiKeyId,
            token
        };
    } else {
        return {};
    }
};

const authenticateAdminAPIKey = function authenticateAdminAPIKey(req, res, next) {
    // allow fallthrough to other auth methods or final ensureAuthenticated check
    if (!req.headers || !req.headers.authorization) {
        return next();
    }

    if (req.query && req.query.content_key) {
        return next(new UnauthorizedError({
            message: 'Admin API does not support query param authentication',
            code: 'INVALID_AUTH_TYPE'
        }));
    }

    let {apiKeyId, token} = extractCredentialsFromHeader(req.headers.authorization);

    if (!apiKeyId || !token) {
        return next(new UnauthorizedError({
            message: 'Authorization header format is "Authorization: Bearer [api key id]|[token]"',
            code: 'INVALID_AUTH_HEADER'
        }));
    }

    models.ApiKey.findOne({id: apiKeyId}).then((apiKey) => {
        if (!apiKey) {
            return next(new UnauthorizedError({
                message: 'Unknown Admin API Key',
                code: 'UNKNOWN_ADMIN_API_KEY'
            }));
        }

        if (apiKey.get('type') !== 'admin') {
            return next(new UnauthorizedError({
                message: 'Incorrect API Key type',
                code: 'INCORRECT_API_KEY_TYPE'
            }));
        }

        // TODO: should we do Buffer.from(x, 'hex') or is using the secret as-is ok?
        try {
            // TODO: grab the decoded payload and check if the payload endpoint
            // matches the requested endpoint
            jwt.verify(token, apiKey.get('secret'), JWT_OPTIONS);
        } catch (err) {
            if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
                return next(new UnauthorizedError({
                    message: `Invalid JWT: ${err.message}`,
                    code: 'INVALID_JWT',
                    err
                }));
            }

            // unknown error
            return next(InternalServerError(err));
        }

        // authenticated OK, store the api key on the request for later checks and logging
        req.api_key = apiKey;
        next();
    });
};

module.exports = {
    authenticateAdminAPIKey
};
