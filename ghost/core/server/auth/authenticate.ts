import type { RequestHandler } from 'express';
import { createPrincipalResolver } from './resolve-principal';

const session = require('./session').default;
const apiKeyAuth = require('./api-key');
const members = require('./members');
const config = require('../../shared/config');

export interface Authenticate {
  authenticateAdminApi: RequestHandler[];
  authenticateAdminApiWithUrl: RequestHandler[];
  authenticateContentApi: RequestHandler[];
}

const legacy: Authenticate = {
  authenticateAdminApi: [apiKeyAuth.admin.authenticate, session.authenticate],
  authenticateAdminApiWithUrl: [apiKeyAuth.admin.authenticateWithUrl],

  authenticateContentApi: [
    apiKeyAuth.content.authenticateContentApiKey,
    members.authenticateMembersToken,
  ],
};

// Under auth:engine better-auth the key middleware still verifies keys, then
// resolvePrincipal sets req.auth and replaces the legacy session lookup
function createBetterAuth(): Authenticate {
  // Better Auth loads only under its engine
  const { fromNodeHeaders } = require('better-auth/node');
  const betterAuth = require('./better-auth').default;
  const models = require('../models');
  const urlUtils = require('../../shared/url-utils').default;

  const resolver = createPrincipalResolver({
    getSession(headers) {
      // Read per call: this module can load before boot builds the instance
      return betterAuth.service.api.getSession({ headers: fromNodeHeaders(headers) });
    },
    getOriginOfRequest: session.getOriginOfRequest,
    getAdminOrigin: () => urlUtils.getAdminOrigin(),
    findActiveUser(id) {
      return models.User.findOne({ id, status: 'active' });
    },
  });

  return {
    authenticateAdminApi: [apiKeyAuth.admin.authenticate, resolver.adminApi],
    authenticateAdminApiWithUrl: [apiKeyAuth.admin.authenticateWithUrl, resolver.adminApiWithUrl],
    authenticateContentApi: [
      apiKeyAuth.content.authenticateContentApiKey,
      resolver.contentApi,
      members.authenticateMembersToken,
    ],
  };
}

// Chosen once at load, like the handler mount in the Admin API app
const authenticate: Authenticate =
  config.get('auth:engine') === 'better-auth' ? createBetterAuth() : legacy;

export default authenticate;
