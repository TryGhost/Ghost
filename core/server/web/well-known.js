const express = require('../../shared/express');
const settings = require('../../shared/settings-cache');

module.exports = function setupWellKnownApp() {
    const wellKnownApp = express('well-known');

    const jose = require('node-jose');
    const dangerousPrivateKey = settings.get('ghost_private_key');
    const keyStore = jose.JWK.createKeyStore();
    const keyStoreReady = keyStore.add(dangerousPrivateKey, 'pem');

    const getSafePublicJWKS = async () => {
        await keyStoreReady;
        return keyStore.toJSON();
    };

    wellKnownApp.get('/jwks.json', async (req, res) => {
        const jwks = await getSafePublicJWKS();

        // there's only one key in the store atm
        // based on this setting all of the keys to have
        // "use": "sig" property
        const keys = jwks.keys
            .map((key) => {
                key.use = 'sig';
                return key;
            });

        res.json({keys});
    });

    return wellKnownApp;
};
