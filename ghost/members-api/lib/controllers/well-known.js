const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    keyStoreError: 'There was an error with the keystore. Please check the settings.'   
};

/**
 * @typedef {import('node-jose').JWK[]} JWKS
 */

/**
 * @typedef {object} ITokenService
 * @prop {() => Promise<JWKS>} getPublicKeys
 */

/**
 * @typedef {object} ILogging
 * @prop {(msg) => void} info
 * @prop {(msg) => void} warn
 * @prop {(msg) => void} error
 */

module.exports = class WellKnownController {
    /**
     * 
     * @param {object} deps 
     * @param {ITokenService} deps.tokenService 
     * @param {ILogging} deps.logging 
     */
    constructor(deps) {
        this._logging = deps.logging;
        this._tokenService = deps.tokenService;
    }

    /**
     * 
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    async getPublicKeys(req, res) {
        try {
            const jwks = await this._tokenService.getPublicKeys();
            res.json(jwks);
        } catch (err) {
            const error = new errors.InternalServerError({
                message: tpl(messages.keyStoreError),
                err
            });
            this._logging.error(error);
            throw error;
        }
    }
};
