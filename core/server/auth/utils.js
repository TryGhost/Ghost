var Promise = require('bluebird'),
    _ = require('lodash'),
    debug = require('ghost-ignition').debug('auth:utils'),
    models = require('../models'),
    globalUtils = require('../utils'),
    knex = require('../data/db').knex,
    _private = {};

/**
 * The initial idea was to delete all old tokens connected to a user and a client.
 * But if multiple browsers/apps are using the same client, we would log out them out.
 * So the idea is to always decrease the expiry of the old access token if available.
 * This access token auto expires and get's cleaned up on bootstrap (see oauth.js).
 */
_private.decreaseOldAccessTokenExpiry = function decreaseOldAccessTokenExpiry(data, options) {
    debug('decreaseOldAccessTokenExpiry', data, options);

    if (!data.token) {
        return Promise.resolve();
    }

    return models.Accesstoken.findOne(data, options)
        .then(function (oldAccessToken) {
            if (!oldAccessToken) {
                return Promise.resolve();
            }

            return models.Accesstoken.edit({
                expires: Date.now() + globalUtils.FIVE_MINUTES_MS
            }, _.merge({id: oldAccessToken.id}, options));
        });
};

_private.destroyOldRefreshToken = function destroyOldRefreshToken(options) {
    debug('destroyOldRefreshToken', options);

    if (!options.token) {
        return Promise.resolve();
    }

    return models.Refreshtoken.destroyByToken(options);
};

/**
 * A user can have one token per client at a time.
 * If the user requests a new pair of tokens, we decrease the expiry of the old access token
 * and re-add the refresh token (this happens because this function is used for 3 different cases).
 * If the operation fails in between, the user can still use e.g. the refresh token and try again.
 */
module.exports.createTokens = function createTokens(options) {
    options = options || {};
    debug('createTokens');

    var oldAccessToken = options.oldAccessToken,
        oldRefreshToken = options.oldRefreshToken,
        newAccessToken = globalUtils.uid(191),
        newRefreshToken = oldRefreshToken || globalUtils.uid(191),
        accessExpires = Date.now() + globalUtils.ONE_MONTH_MS,
        refreshExpires = Date.now() + globalUtils.SIX_MONTH_MS,
        clientId = options.clientId,
        userId = options.userId,
        modelOptions;

    return knex.transaction(function (transaction) {
        modelOptions = {transacting: transaction};

        return _private.decreaseOldAccessTokenExpiry({token: oldAccessToken}, modelOptions)
            .then(function () {
                return _private.destroyOldRefreshToken(_.merge({
                    token: oldRefreshToken
                }, modelOptions));
            })
            .then(function () {
                return models.Refreshtoken.add({
                    token: newRefreshToken,
                    user_id: userId,
                    client_id: clientId,
                    expires: refreshExpires
                }, modelOptions);
            })
            .then(function (refreshToken) {
                return models.Accesstoken.add({
                    token: newAccessToken,
                    user_id: userId,
                    client_id: clientId,
                    issued_by: refreshToken.id,
                    expires: accessExpires
                }, modelOptions);
            })
            .then(function () {
                return {
                    access_token: newAccessToken,
                    refresh_token: newRefreshToken,
                    expires_in: globalUtils.ONE_MONTH_S
                };
            });
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
