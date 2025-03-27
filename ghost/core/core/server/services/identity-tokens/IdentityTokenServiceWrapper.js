const {IdentityTokenService} = require('./IdentityTokenService');

module.exports = class IdentityTokenServiceWrapper {
    /** @type IdentityTokenService */
    static instance;

    static async init() {
        if (IdentityTokenServiceWrapper.instance) {
            return;
        }

        const urlUtils = require('../../../shared/url-utils');
        const issuer = urlUtils.urlFor('admin', true);

        const settings = require('../../../shared/settings-cache');
        const jose = require('node-jose');

        const privateKey = settings.get('ghost_private_key');
        const keyStore = jose.JWK.createKeyStore();
        const key = await keyStore.add(privateKey, 'pem');

        IdentityTokenServiceWrapper.instance = new IdentityTokenService(
            privateKey,
            issuer,
            key.kid
        );
    }
};
