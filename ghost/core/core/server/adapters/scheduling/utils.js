const adapterManager = require('../../services/adapter-manager');
const models = require('../../models');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const moment = require('moment');
const jwt = require('jsonwebtoken');

const messages = {
    resourceNotFound: '{resource} not found.'
};

exports.createAdapter = function createAdapter() {
    return adapterManager.getAdapter('scheduling');
};

/**
 * @description Load the internal scheduler integration
 *
 * @return {Promise}
 */
exports.getSchedulerIntegration = function () {
    return models.Integration.findOne({slug: 'ghost-scheduler'}, {withRelated: 'api_keys'})
        .then((integration) => {
            if (!integration) {
                throw new errors.NotFoundError({
                    message: tpl(messages.resourceNotFound, {resource: 'Integration'})
                });
            }
            return integration.toJSON();
        });
};

/**
 * @internal
 * @typedef {object} ApiKey
 * @property {string} id
 * @property {string} secret
 */

/**
 * @description Get signed admin token for making authenticated scheduling requests
 *
 * @param {object} options
 * @param {string} options.publishedAt - ISO date
 * @param {string} options.apiUrl - url of the JWT's audience
 * @param {object} options.integration - integration object containing the key to sign the token with
 * @param {ApiKey[]} options.integration.api_keys - array of API keys for the integration
 *
 * @return {string} the JSON Web Token
 */
exports.getSignedAdminToken = function ({publishedAt, apiUrl, integration}) {
    const key = {
        id: integration.api_keys[0].id,
        secret: integration.api_keys[0].secret
    };

    const JWT_OPTIONS = /** @type {const} */ ({
        keyid: key.id,
        algorithm: 'HS256',
        audience: apiUrl,
        noTimestamp: true
    });

    // Default token expiry is till 6 hours after scheduled time
    // or if published_at is in past then till 6 hours after blog start
    // to allow for retries in case of network issues
    // and never before 10 mins to publish time
    let tokenExpiry = moment(publishedAt).add(6, 'h');
    if (tokenExpiry.isBefore(moment())) {
        tokenExpiry = moment().add(6, 'h');
    }

    return jwt.sign(
        {
            exp: tokenExpiry.unix(),
            nbf: moment(publishedAt).subtract(10, 'm').unix()
        },
        Buffer.from(key.secret, 'hex'),
        JWT_OPTIONS
    );
};