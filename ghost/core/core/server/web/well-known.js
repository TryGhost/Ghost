const express = require('../../shared/express');
const settings = require('../../shared/settings-cache');
const config = require('../../shared/config');
const {cacheControl} = require('./shared/middleware');

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

    const cache = cacheControl('public', {maxAge: config.get('caching:wellKnown:maxAge')});

    wellKnownApp.get('/jwks.json', cache, async function jwksMiddleware(req, res) {
        const jwks = await getSafePublicJWKS();

        // there's only one key in the store atm
        // based on this setting all of the keys to have
        // "use": "sig" property
        const keys = jwks.keys
            .map(key => ({
                e: key.e,
                kid: key.kid,
                kty: key.kty,
                n: key.n,
                use: 'sig'
            }));

        res.json({keys});
    });

    return wellKnownApp;
};
