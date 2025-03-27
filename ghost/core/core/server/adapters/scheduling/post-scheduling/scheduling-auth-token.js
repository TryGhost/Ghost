const moment = require('moment');
const jwt = require('jsonwebtoken');

/**
 * @description Get signed admin token for making authenticated scheduling requests
 *
 * @param {Object} options
 * @param {string} options.publishedAt - ISO date
 * @param {string} options.apiUrl - url of the JWT's audience
 * @param {string} options.key - integration key
 * @param {string} options.key.id - key ID
 * @param {string} options.key.secret - key secret
 *
 * @return {string} the JSON Web Token
 */
const getSignedAdminToken = function ({publishedAt, apiUrl, key}) {
    const JWT_OPTIONS = {
        keyid: key.id,
        algorithm: 'HS256',
        audience: apiUrl,
        noTimestamp: true
    };

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

module.exports = getSignedAdminToken;
