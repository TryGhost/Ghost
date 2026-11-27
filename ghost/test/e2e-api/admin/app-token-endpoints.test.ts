import { agentProvider, fixtureManager } from '../../utils/e2e-framework';

const configUtils = require('../../utils/config-utils');

// Apps get tokens from Better Auth's OAuth provider, so they work only under its engine
const isBetterAuth = configUtils.config.get('auth:engine') === 'better-auth';

describe.skipIf(!isBetterAuth)("Ghost's app token endpoints", function () {
  type Agent = { post(path: string): any; loginAsOwner(): Promise<void> };
  let signedOut: Agent;
  let signedIn: Agent;

  beforeAll(async function () {
    signedOut = await agentProvider.getAdminAPIAgent();
    signedIn = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await signedIn.loginAsOwner();
  });

  it('are server-only, so no request reaches them, signed in or not', async function () {
    const paths = [
      'reconcile-app-client',
      'issue-app-user-token',
      'validate-app-token',
      'reconcileAppClient',
      'issueAppUserToken',
      'validateAppToken',
    ];
    for (const agent of [signedOut, signedIn]) {
      for (const path of paths) {
        await agent
          .post(`auth/${path}`)
          .body({ installationId: 'x', active: true, scopes: [], token: 'x' })
          .expectStatus(404);
      }
    }
  });
});
