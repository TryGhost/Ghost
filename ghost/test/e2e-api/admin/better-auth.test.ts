const { agentProvider } = require('../../utils/e2e-framework');

describe('Better Auth native routes under auth:engine legacy', function () {
  let agent: { post(path: string): any; get(path: string): any };

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
  });

  it('are not mounted', async function () {
    await agent.get('auth/ok').expectStatus(404);
    await agent
      .post('auth/sign-in/email')
      .body({ email: 'jbloggs@example.com', password: 'password' })
      .expectStatus(404);
  });
});
