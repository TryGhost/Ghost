var Promise = require('bluebird'),
    _ = require('lodash'),
    debug = require('ghost-ignition').debug('auth:utils'),
    models = require('../../models'),
    security = require('../../lib/security'),
    constants = require('../../lib/constants'),
    _private = {};

/**
 * The initial idea was to delete all old tokens connected to a user and a client.
 * But if multiple browsers/apps are using the same client, we would log out them out.
 * So the idea is to always decrease the expiry of the old access token if available.
 * This access token auto expires and get's cleaned up on bootstrap (see oauth.js).
 */
_private.decreaseOldAccessTokenExpiry = function decreaseOldAccessTokenExpiry(data, options) {
    debug('decreaseOldAccessTokenExpiry', data);

    if (!data.token) {
        return Promise.resolve();
    }

    return models.Accesstoken.findOne(data, options)
        .then(function (oldAccessToken) {
            if (!oldAccessToken) {
                return Promise.resolve();
            }

            return models.Accesstoken.edit({
                expires: Date.now() + constants.FIVE_MINUTES_MS
            }, _.merge({id: oldAccessToken.id}, options));
        });
};

_private.handleOldRefreshToken = function handleOldRefreshToken(data, options) {
    debug('handleOldRefreshToken', data.oldRefreshToken);

    if (!data.oldRefreshToken) {
        return models.Refreshtoken.add({
            token: data.newRefreshToken,
            user_id: data.userId,
            client_id: data.clientId,
            expires: data.refreshExpires
        }, options);
    }

    // extend refresh token expiry
    return models.Refreshtoken.edit({
        expires: data.refreshExpires
    }, _.merge({id: data.oldRefreshId}, options));
};

_private.handleTokenCreation = function handleTokenCreation(data, options) {
    var oldAccessToken = data.oldAccessToken,
        oldRefreshToken = data.oldRefreshToken,
        oldRefreshId = data.oldRefreshId,
        newAccessToken = security.identifier.uid(191),
        newRefreshToken = security.identifier.uid(191),
        accessExpires = Date.now() + constants.ONE_MONTH_MS,
        refreshExpires = Date.now() + constants.SIX_MONTH_MS,
        clientId = data.clientId,
        userId = data.userId;

    return _private.decreaseOldAccessTokenExpiry({token: oldAccessToken}, options)
        .then(function () {
            return _private.handleOldRefreshToken({
                userId: userId,
                clientId: clientId,
                oldRefreshToken: oldRefreshToken,
                oldRefreshId: oldRefreshId,
                newRefreshToken: newRefreshToken,
                refreshExpires: refreshExpires
            }, options);
        })
        .then(function (refreshToken) {
            return models.Accesstoken.add({
                token: newAccessToken,
                user_id: userId,
                client_id: clientId,
                issued_by: refreshToken.id,
                expires: accessExpires
            }, options);
        })
        .then(function () {
            return {
                access_token: newAccessToken,
                refresh_token: newRefreshToken,
                expires_in: constants.ONE_MONTH_S
            };
        });
};

/**
 * A user can have one token per client at a time.
 * If the user requests a new pair of tokens, we decrease the expiry of the old access token
 * and re-add the refresh token (this happens because this function is used for 3 different cases).
 * If the operation fails in between, the user can still use e.g. the refresh token and try again.
 */
module.exports.createTokens = function createTokens(data, modelOptions) {
    data = data || {};
    modelOptions = modelOptions || {};

    debug('createTokens');

    if (modelOptions.transacting) {
        return _private.handleTokenCreation(data, modelOptions);
    }

    return models.Base.transaction(function (transaction) {
        modelOptions.transacting = transaction;

        return _private.handleTokenCreation(data, modelOptions);
    });
};

module.exports.getBearerAutorizationToken = function (req) {
    var parts,
        scheme,
        token;

    if (req.headers && req.headers.authorization) {
        parts = req.headers.authorization.split(' ');
        scheme = parts[0];

        if (/^Bearer$/i.test(scheme)) {
            token = parts[1];
        }
    } else if (req.query && req.query.access_token) {
        token = req.query.access_token;
    }

    return token;
};

module.exports.hasGrantType = function hasGrantType(req, type) {
    return req.body && req.body.hasOwnProperty('grant_type') && req.body.grant_type === type
        || req.query && req.query.hasOwnProperty('grant_type') && req.query.grant_type === type;
};
