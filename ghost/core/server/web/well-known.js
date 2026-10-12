const express = require('../../shared/express');
const config = require('../../shared/config');
const { cacheControl } = require('./shared/middleware');
const signingKeys = require('../services/signing-keys');

module.exports = function setupWellKnownApp() {
  const wellKnownApp = express('well-known');

  const staffKeys = signingKeys.getInstance().forPurpose('staff');

  const cache = cacheControl('public', { maxAge: config.get('caching:wellKnown:maxAge') });

  wellKnownApp.get('/jwks.json', cache, async function jwksMiddleware(req, res, next) {
    try {
      // The signing key comes first for verifiers that only read keys[0]
      res.json(await staffKeys.getJwks());
    } catch (err) {
      next(err);
    }
  });

  return wellKnownApp;
};
