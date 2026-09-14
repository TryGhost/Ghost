const { IdentityTokenService } = require('./identity-token-service');

module.exports = class IdentityTokenServiceWrapper {
  /** @type IdentityTokenService */
  static instance;

  static async init() {
    if (IdentityTokenServiceWrapper.instance) {
      return;
    }

    const urlUtils = require('../../../shared/url-utils').default;
    const issuer = urlUtils.urlFor('admin', true);

    const settings = require('../../../shared/settings-cache');
    const { getPublicKeyInfo } = require('../../lib/public-jwk');

    const privateKey = settings.get('ghost_private_key');
    const { kid } = await getPublicKeyInfo(privateKey);

    IdentityTokenServiceWrapper.instance = new IdentityTokenService(privateKey, issuer, kid);
  }
};
