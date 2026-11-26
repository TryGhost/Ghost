import type { RequestHandler } from 'express';
import {
  createPrincipalResolver,
  fromApiKey,
  legacyAdminApi,
  unlessKeyed,
} from './resolve-principal';
import session from './session';
import { appTokenAuthentication, unlessAppToken } from './app-token';
import { findActiveStaffUser } from './staff-users';
import apiKeyAuth from './api-key';
import * as members from './members';

export interface Authenticate {
  authenticateAdminApi: RequestHandler[];
  /**
   * For the Admin API's public endpoints, which take whoever calls: nobody has to be
   * authenticated, but an app's token is, so an app is still an app there.
   */
  authenticatePublicAdminApi: RequestHandler[];
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
  // Apps get no tokens under this engine
  authenticatePublicAdminApi: [],
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
  const urlUtils = require('../../shared/url-utils').default;

  const resolver = createPrincipalResolver({
    getSession(headers) {
      // Read per call: this module can load before boot builds the instance
      return betterAuth.service.api.getSession({ headers: fromNodeHeaders(headers) });
    },
    getOriginOfRequest: session.getOriginOfRequest,
    getAdminOrigin: () => urlUtils.getAdminOrigin(),
    findActiveUser: findActiveStaffUser,
  });

  const authenticateAppToken = appTokenAuthentication();

  return {
    // An app token authenticates on its own; the key check and the cookie never see it
    authenticateAdminApi: [
      authenticateAppToken,
      unlessAppToken(apiKeyAuth.admin.authenticate),
      unlessAppToken(resolver.adminApi),
    ],
    authenticatePublicAdminApi: [authenticateAppToken],
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
