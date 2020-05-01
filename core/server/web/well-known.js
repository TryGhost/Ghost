const express = require('../../shared/express');
const settings = require('../services/settings/cache');
const jose = require('node-jose');

const dangerousPrivateKey = settings.get('ghost_private_key');
const keyStore = jose.JWK.createKeyStore();
const keyStoreReady = keyStore.add(dangerousPrivateKey, 'pem');

const getSafePublicJWKS = async () => {
    await keyStoreReady;
    return keyStore.toJSON();
};

module.exports = function setupWellKnownApp() {
    const wellKnownApp = express('well-known');

    wellKnownApp.get('/jwks.json', async (req, res) => {
        const jwks = await getSafePublicJWKS();
        res.json(jwks);
    });

    return wellKnownApp;
};
