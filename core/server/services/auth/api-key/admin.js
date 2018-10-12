const jwt = require('jsonwebtoken');
const models = require('../../../models');
const common = require('../../../lib/common');

const JWT_OPTIONS = {
    maxAge: '5m',
    algorithms: ['HS256']
};

/**
 * Remove 'Ghost' from raw authorization header and extract the JWT token.
 * Eg. Authorization: Ghost ${JWT}
 * @param {string} header
 */
const _extractTokenFromHeader = function extractTokenFromHeader(header) {
    const [scheme, token] = header.split(' ');

    if (/^Ghost$/i.test(scheme)) {
        return token;
    }

    return;
};

/**
 * Admin API key authentication flow:
 * 1. extract the JWT token from the `Authorization: Ghost xxxx` header
 * 2. decode the JWT to extract the api_key id from the "key id" header claim
 * 3. find a matching api_key record
 * 4. verify the JWT (matching secret, matching URL path, not expired)
 * 5. place the api_key object on `req.api_key`
 *
 * There are some specifcs of the JWT that we expect:
 * - the "Key ID" header parameter should be set to the id of the api_key used to sign the token
 *   https://tools.ietf.org/html/rfc7515#section-4.1.4
 * - the "Audience" claim should match the requested API path
 *   https://tools.ietf.org/html/rfc7519#section-4.1.3
 */
const authenticateAdminApiKey = function authenticateAdminApiKey(req, res, next) {
    // we don't have an Authorization header so allow fallthrough to other
    // auth middleware or final "ensure authenticated" check
    if (!req.headers || !req.headers.authorization) {
        return next();
    }

    const token = _extractTokenFromHeader(req.headers.authorization);

    if (!token) {
        return next(new common.errors.UnauthorizedError({
            message: common.i18n.t('errors.middleware.auth.incorrectAuthHeaderFormat'),
            code: 'INVALID_AUTH_HEADER'
        }));
    }

    const decoded = jwt.decode(token, {complete: true});

    if (!decoded || !decoded.header) {
        return next(new common.errors.BadRequestError({
            message: common.i18n.t('errors.middleware.auth.invalidJwt'),
            code: 'INVALID_JWT'
        }));
    }

    const apiKeyId = decoded.header.kid;

    models.ApiKey.findOne({id: apiKeyId}).then((apiKey) => {
        if (!apiKey) {
            return next(new common.errors.UnauthorizedError({
                message: common.i18n.t('errors.middleware.auth.unknownAdminApiKey'),
                code: 'UNKNOWN_ADMIN_API_KEY'
            }));
        }

        if (apiKey.get('type') !== 'admin') {
            return next(new common.errors.UnauthorizedError({
                message: common.i18n.t('errors.middleware.auth.invalidApiKeyType'),
                code: 'INVALID_API_KEY_TYPE'
            }));
        }

        const secret = Buffer.from(apiKey.get('secret'), 'hex');
        // ensure the token was meant for this endpoint
        const options = Object.assign({
            aud: req.originalUrl
        }, JWT_OPTIONS);

        try {
            jwt.verify(token, secret, options);
        } catch (err) {
            if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
                return next(new common.errors.UnauthorizedError({
                    message: common.i18n.t('errors.middleware.auth.invalidJwtWithMessage', {message: err.message}),
                    code: 'INVALID_JWT',
                    err
                }));
            }

            // unknown error
            return next(new common.errors.InternalServerError({err}));
        }

        // authenticated OK, store the api key on the request for later checks and logging
        req.api_key = apiKey;
        next();
    }).catch((err) => {
        next(new common.errors.InternalServerError({err}));
    });
};

module.exports = {
    authenticateAdminApiKey
};
