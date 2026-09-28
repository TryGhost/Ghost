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

    const signingKeys = require('../signing-keys');

    IdentityTokenServiceWrapper.instance = new IdentityTokenService(
      signingKeys.getInstance().forPurpose('staff'),
      issuer,
    );
  }
};
