import type { RequestHandler } from 'express';
import {
  createPrincipalResolver,
  fromApiKey,
  legacyAdminApi,
  unlessKeyed,
} from './resolve-principal';
import session from './session';
import apiKeyAuth from './api-key';
import * as members from './members';

export interface Authenticate {
  authenticateAdminApi: RequestHandler[];
  authenticateAdminApiWithUrl: RequestHandler[];
  authenticateContentApi: RequestHandler[];
}

// Its Req type requires req.session, but the session service loads it itself
const sessionAuthenticate = session.authenticate as unknown as RequestHandler;

// Each chain sets req.auth from what its key and session middleware resolved
const legacy: Authenticate = {
  authenticateAdminApi: [
    apiKeyAuth.admin.authenticate,
    unlessKeyed(sessionAuthenticate),
    legacyAdminApi,
  ],
  authenticateAdminApiWithUrl: [apiKeyAuth.admin.authenticateWithUrl, fromApiKey('admin_api_key')],

  authenticateContentApi: [
    apiKeyAuth.content.authenticateContentApiKey,
    fromApiKey('content_api_key'),
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
const authenticate: Authenticate = require('./index').isBetterAuth ? createBetterAuth() : legacy;

export default authenticate;
