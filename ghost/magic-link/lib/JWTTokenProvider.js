const {UnauthorizedError} = require('@tryghost/errors');
const jwt = require('jsonwebtoken');

/**
 * @typedef {import('jsonwebtoken').Secret} Secret
 * @typedef {string} JSONWebToken
 */

/**
 * @typedef {Object<string, any>} Data
 */

module.exports = class JWTTokenProvider {
    /**
     * @param {Secret} secret
     */
    constructor(secret) {
        this.secret = secret;
    }

    /**
     * @param {Data} data
     * @returns {Promise<JSONWebToken>}
     */
    async create(data) {
        const token = jwt.sign(data, this.secret, {
            algorithm: 'HS256',
            expiresIn: '10m'
        });

        return token;
    }

    /**
     * @param {JSONWebToken} token
     * @returns {Promise<Data>}
     */
    async validate(token) {
        /** @type any */
        const claims = jwt.verify(token, this.secret, {
            algorithms: ['HS256'],
            maxAge: '10m'
        });

        if (!claims || typeof claims === 'string') {
            // @TODO: throw a detailed error message here
            throw new UnauthorizedError();
        }

        return claims;
    }
};
