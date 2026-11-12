import type { RequestHandler } from 'express';

const session = require('./session').default;
const apiKeyAuth = require('./api-key');
const members = require('./members');

export interface Authenticate {
  authenticateAdminApi: RequestHandler[];
  authenticateAdminApiWithUrl: RequestHandler[];
  authenticateContentApi: RequestHandler[];
}

const authenticate: Authenticate = {
  authenticateAdminApi: [apiKeyAuth.admin.authenticate, session.authenticate],
  authenticateAdminApiWithUrl: [apiKeyAuth.admin.authenticateWithUrl],

  authenticateContentApi: [
    apiKeyAuth.content.authenticateContentApiKey,
    members.authenticateMembersToken,
  ],
};

export default authenticate;
