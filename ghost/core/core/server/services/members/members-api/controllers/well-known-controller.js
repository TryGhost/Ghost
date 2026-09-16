const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');

const messages = {
  keyStoreError: 'There was an error with the keystore. Please check the settings.',
};

/**
 * @typedef {import('../../../../lib/public-jwk').PublicRsaJwk & {kid: string}} PublicJWK
 * @typedef {{keys: PublicJWK[]}} JWKS
 */

/**
 * @typedef {object} ITokenService
 * @prop {() => Promise<JWKS>} getPublicKeys
 */

module.exports = class WellKnownController {
  /**
   *
   * @param {object} deps
   * @param {ITokenService} deps.tokenService
   */
  constructor(deps) {
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
        err,
      });
      logging.error(error);
      throw error;
    }
  }
};
