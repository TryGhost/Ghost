var Promise = require('bluebird'),
    debug = require('ghost-ignition').debug('auth:utils'),
    models = require('../models'),
    globalUtils = require('../utils'),
    knex = require('../data/db').knex,
    _private = {};

_private.removeTokens = function removeTokens(data, options) {
    debug('removeTokens', data, options);

    return models.Accesstoken.destroyByUserAndClient(data, options)
        .then(function () {
            return models.Refreshtoken.destroyByUserAndClient(data, options);
        });
};

/**
 * A user can have one token per client at a time.
 * If the user requests a new pair of tokens, we run the token deletion and creation in a transaction.
 * If the operation fails in between, the user can still use e.g. the refresh token and try again.
 */
module.exports.createTokens = function createTokens(options) {
    options = options || {};
    debug('createTokens');

    var accessToken = options.accessToken || globalUtils.uid(191),
        refreshToken = options.refreshToken || globalUtils.uid(191),
        accessExpires = Date.now() + globalUtils.ONE_MONTH_MS,
        refreshExpires = Date.now() + globalUtils.SIX_MONTH_MS,
        clientId = options.clientId,
        userId = options.userId,
        modelOptions;

    return knex.transaction(function (transaction) {
        modelOptions = {transacting: transaction};

        return _private.removeTokens({
            clientId: clientId,
            userId: userId
        }, modelOptions)
            .then(function () {
                return models.Accesstoken.add({
                    token: accessToken,
                    user_id: userId,
                    client_id: clientId,
                    expires: accessExpires
                }, modelOptions);
            })
            .then(function () {
                return models.Refreshtoken.add({
                    token: refreshToken,
                    user_id: userId,
                    client_id: clientId,
                    expires: refreshExpires
                }, modelOptions);
            })
            .then(function () {
                return {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    expires_in: globalUtils.ONE_MONTH_S
                };
            });
    });
};
