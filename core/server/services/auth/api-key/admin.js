const jwt = require('jsonwebtoken');
const models = require('../../../models');
const {
    BadRequestError,
    InternalServerError,
    UnauthorizedError
} = require('../../../lib/common/errors');

const JWT_OPTIONS = {
    maxAge: '5m',
    algorithms: ['HS256']
};

/**
 * Remove 'Bearer' from raw authorization header and extract the JWT token.
 * Eg. Authorization: Bearer ${JWT}
 * @param {string} header
 */
const extractTokenFromHeader = function extractTokenFromHeader(header) {
    const [scheme, token] = header.split(' ');

    if (/^Bearer$/i.test(scheme)) {
        return token;
    }

    return;
};

const authenticateAdminAPIKey = function authenticateAdminAPIKey(req, res, next) {
    if (req.query && req.query.content_key) {
        return next(new BadRequestError({
            message: 'Admin API does not support query param authentication',
            code: 'INVALID_AUTH_TYPE'
        }));
    }

    // allow fallthrough to other auth methods or final ensureAuthenticated check
    if (!req.headers || !req.headers.authorization) {
        return next();
    }

    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
        return next(new UnauthorizedError({
            message: 'Authorization header format is "Authorization: Bearer [token]"',
            code: 'INVALID_AUTH_HEADER'
        }));
    }

    const decoded = jwt.decode(token, {complete: true});

    if (!decoded || !decoded.header) {
        return next(BadRequestError({
            message: 'Invalid JWT',
            code: 'INVALID_JWT'
        }));
    }

    const apiKeyId = decoded.header.kid;

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

        const secret = Buffer.from(apiKey.get('secret'), 'hex');
        const options = Object.assign({
            // ensure the token was meant for this endpoint
            aud: req.originalUrl
        }, JWT_OPTIONS);

        try {
            jwt.verify(token, secret, options);
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

module.exports = authenticateAdminAPIKey;
