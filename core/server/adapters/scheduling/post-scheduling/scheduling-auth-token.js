const moment = require('moment');
const jwt = require('jsonwebtoken');

/**
 * @description Get signed admin token for making authenticated scheduling requests
 *
 * @return {Promise}
 */
const getSignedAdminToken = function ({publishedAt, apiUrl, integration}) {
    let key = integration.api_keys[0];

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
