const debug = require('@tryghost/debug')('web:endpoints:admin:app');
const bodyParser = require('body-parser');
const errorHandler = require('@tryghost/mw-error-handler');

const { checkVersionMatch } = require('../../middleware/check-version-match');
const { parseQueryBooleans } = require('../../middleware/parse-query-booleans');
const shared = require('../../../shared');
const auth = require('../../../../auth');
const config = require('../../../../../shared/config');
const express = require('../../../../../shared/express');
const sentry = require('../../../../../shared/sentry');
const routes = require('./routes');

/**
 * @returns {import('express').Application}
 */
module.exports = function setupApiApp() {
  debug('Admin API setup start');
  const apiApp = express('admin api');

  // API middleware

  // Admin API shouldn't be cached
  apiApp.use(shared.middleware.cacheControl('private'));

  // Before body parsing: Better Auth reads the request stream itself
  if (config.get('auth:engine') === 'better-auth') {
    const { betterAuthRouter } = require('./better-auth');
    apiApp.use(betterAuthRouter(auth.betterAuth.service));
  }

  // Body parsing
  apiApp.use(bodyParser.json({ limit: '50mb' }));
  apiApp.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

  // Query parsing
  apiApp.use(parseQueryBooleans);

  // Check version matches for API requests, depends on res.locals.safeVersion being set
  // Therefore must come after themeHandler.ghostLocals, for now
  apiApp.use(checkVersionMatch);

  // Routing
  apiApp.use(routes());

  // API error handling
  apiApp.use(errorHandler.resourceNotFound);
  apiApp.use(errorHandler.handleJSONResponse(sentry));

  debug('Admin API setup end');

  return apiApp;
};
