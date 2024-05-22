const jwt = require('jsonwebtoken');

/**
 * Remove 'Ghost' from raw authorization header and extract the JWT token.
 * Eg. Authorization: Ghost ${JWT}
 * @param {string} header
 */
const extractTokenFromHeader = (header) => {
    const [scheme, token] = header.split(' ');

    if (/^Ghost$/i.test(scheme)) {
        return token;
    }
};

const extractAdminAPIKey = (token) => {
    const decoded = jwt.decode(token, {complete: true});

    if (!decoded || !decoded.header || !decoded.header.kid) {
        return null;
    }

    return decoded.header.kid;
};

/**
 * @typedef {object} ApiKey
 * @prop {string} key
 * @prop {string} type
 */

/**
 * When it's a Content API the function resolves with the value of the key secret.
 * When it's an Admin API the function resolves with the value of the key id.
 *
 * @param {import('express').Request} req
 * @returns {ApiKey}
 */
const extractAPIKey = (req) => {
    let keyValue = null;
    let keyType = null;

    if (req.query && req.query.key) {
        keyValue = req.query.key;
        keyType = 'content';
    } else if (req.headers && req.headers.authorization) {
        keyValue = extractAdminAPIKey(extractTokenFromHeader(req.headers.authorization));
        keyType = 'admin';
    }

    return {
        key: keyValue,
        type: keyType
    };
};

module.exports = extractAPIKey;
