const express = require('../../shared/express');
const settings = require('../../shared/settings-cache');
const config = require('../../shared/config');
const { cacheControl } = require('./shared/middleware');
const { getPublicKeyInfo } = require('../lib/public-jwk');

module.exports = function setupWellKnownApp() {
  const wellKnownApp = express('well-known');

  const dangerousPrivateKey = settings.get('ghost_private_key');
  const keyReady = getPublicKeyInfo(dangerousPrivateKey);

  const cache = cacheControl('public', { maxAge: config.get('caching:wellKnown:maxAge') });

  wellKnownApp.get('/jwks.json', cache, async function jwksMiddleware(req, res) {
    const { kid, jwk } = await keyReady;

    // there's only one key in the store atm
    // based on this setting all of the keys to have
    // "use": "sig" property
    const keys = [
      {
        e: jwk.e,
        kid,
        kty: jwk.kty,
        n: jwk.n,
        use: 'sig',
      },
    ];

    res.json({ keys });
  });

  return wellKnownApp;
};
