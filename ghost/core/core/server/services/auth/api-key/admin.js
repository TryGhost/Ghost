const jwt = require('jsonwebtoken');
const url = require('url');
const models = require('../../../models');
const errors = require('@tryghost/errors');
const limitService = require('../../../services/limits');
const {legacyApiPathMatch} = require('../../../services/api-version-compatibility');
const tpl = require('@tryghost/tpl');
const _ = require('lodash');

const messages = {
    incorrectAuthHeaderFormat: 'Authorization header format is "Authorization: Ghost [token]"',
    invalidTokenWithMessage: 'Invalid token: {message}',
    invalidToken: 'Invalid token',
    adminApiKidMissing: 'Admin API kid missing.',
    unknownAdminApiKey: 'Unknown Admin API Key',
    invalidApiKeyType: 'Invalid API Key type'
};

let JWT_OPTIONS_DEFAULTS = {
    /** @type import('jsonwebtoken').Algorithm[] */
    algorithms: ['HS256'],
    maxAge: '5m'
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
};

/**
 * Extract JWT token from admin API URL query
 * Eg. ${ADMIN_API_URL}/?token=${JWT}
 * @param {string} reqUrl
 */
const _extractTokenFromUrl = function extractTokenFromUrl(reqUrl) {
    const {query} = url.parse(reqUrl, true);
    return query.token;
};

const authenticate = function apiKeyAdminAuth(req, res, next) {
    // CASE: we don't have an Authorization header so allow fallthrough to other
    // auth middleware or final "ensure authenticated" check
    if (!req.headers || !req.headers.authorization) {
        req.api_key = null;
        return next();
    }
    const token = _extractTokenFromHeader(req.headers.authorization);

    if (!token) {
        return next(new errors.UnauthorizedError({
            message: tpl(messages.incorrectAuthHeaderFormat),
            code: 'INVALID_AUTH_HEADER'
        }));
    }

    return wrappedAuthenticateWithToken(req, res, next, {token});
};

const authenticateWithUrl = function apiKeyAuthenticateWithUrl(req, res, next) {
    const token = _extractTokenFromUrl(req.originalUrl);
    if (!token) {
        return next(new errors.UnauthorizedError({
            message: tpl(messages.invalidTokenWithMessage, {message: 'No token found in URL'}),
            code: 'INVALID_JWT'
        }));
    }
    // CASE: Scheduler publish URLs can have long maxAge but controllerd by expiry and neverBefore
    return wrappedAuthenticateWithToken(req, res, next, {token, ignoreMaxAge: true});
};

async function wrappedAuthenticateWithToken(req, res, next, options) {
    try {
        const {apiKey, user} = await authenticateWithToken(req.originalUrl, options.token, options.ignoreMaxAge);
        req.api_key = apiKey;
        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Admin API key authentication flow:
 * 1. extract the JWT token from the `Authorization: Ghost xxxx` header or from URL(for schedules)
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
const authenticateWithToken = async function apiKeyAuthenticateWithToken(originalUrl, token, ignoreMaxAge) {
    const decoded = jwt.decode(token, {complete: true});
    const jwtValidationOptions = ignoreMaxAge ? _.omit(JWT_OPTIONS_DEFAULTS, 'maxAge') : JWT_OPTIONS_DEFAULTS;

    if (!decoded || !decoded.header) {
        throw new errors.BadRequestError({
            message: tpl(messages.invalidToken),
            code: 'INVALID_JWT'
        });
    }

    const apiKeyId = decoded.header.kid;

    if (!apiKeyId) {
        throw new errors.BadRequestError({
            message: tpl(messages.adminApiKidMissing),
            code: 'MISSING_ADMIN_API_KID'
        });
    }

    const apiKey = await models.ApiKey.findOne({id: apiKeyId}, {withRelated: ['integration']});

    if (!apiKey) {
        throw new errors.UnauthorizedError({
            message: tpl(messages.unknownAdminApiKey),
            code: 'UNKNOWN_ADMIN_API_KEY'
        });
    }

    if (apiKey.get('type') !== 'admin') {
        throw new errors.UnauthorizedError({
            message: tpl(messages.invalidApiKeyType),
            code: 'INVALID_API_KEY_TYPE'
        });
    }

    // CASE: blocking all non-internal: "custom" and "builtin" integration requests when the limit is reached
    if (limitService.isLimited('customIntegrations')
            && (apiKey.relations.integration && !['internal', 'core'].includes(apiKey.relations.integration.get('type')))) {
        // NOTE: using "checkWouldGoOverLimit" instead of "checkIsOverLimit" here because flag limits don't have
        //       a concept of measuring if the limit has been surpassed
        await limitService.errorIfWouldGoOverLimit('customIntegrations');
    }

    // Decoding from hex and transforming into bytes is here to
    // keep comparison of the bytes that are stored in the secret.
    // Useful context:
    // https://github.com/auth0/node-jsonwebtoken/issues/208#issuecomment-231861138
    const secret = Buffer.from(apiKey.get('secret'), 'hex');

    // Using req.originalUrl means we get the right url even if version-rewrites have happened
    const {version, api} = legacyApiPathMatch(originalUrl);

    // ensure the token was meant for this api
    let options;

    if (version) {
        // CASE: legacy versioned api request
        options = Object.assign({
            audience: new RegExp(`/?${version}/${api}/?$`)
        }, jwtValidationOptions);
    } else {
        options = Object.assign({
            audience: new RegExp(`/?${api}/?$`)
        }, jwtValidationOptions);
    }

    try {
        jwt.verify(token, secret, options);
    } catch (err) {
        throw new errors.UnauthorizedError({
            message: tpl(messages.invalidTokenWithMessage, {message: err.message}),
            code: 'INVALID_JWT',
            err
        });
    }

    // authenticated OK
    let result = {
        user: null,
        apiKey: apiKey
    };

    if (apiKey.get('user_id')) {
        // fetch the user and store it on the request for later checks and logging
        const user = await models.User.findOne(
            {id: apiKey.get('user_id'), status: 'active'},
            {require: true}
        );

        result.user = user;
    }

    return result;
};

module.exports = {
    authenticate,
    authenticateWithUrl,
    authenticateWithToken
};
