const { agentProvider, fixtureManager, matchers } = require('../../utils/e2e-framework');
const { anyContentVersion, stringMatching } = matchers;

describe('Members Stripe Connect API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
    await agent.loginAsOwner();
  });

  it('can do auth', async function () {
    await agent
      .get(`members/stripe_connect`)
      .expectStatus(302)
      .expectEmptyBody()
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        location: stringMatching(
          /^https:\/\/connect\.stripe\.com\/oauth\/authorize\?response_type=code&scope=read_write&client_id=/,
        ),
        'set-cookie': [stringMatching(/^ghost-admin-api-session=/)],
      });
  });

  it('refuses a start from another site', async function () {
    await agent
      .get(`members/stripe_connect`)
      .header('Sec-Fetch-Site', 'cross-site')
      .expectStatus(403);
  });

  it('refuses a start that says neither where it came from nor that it is same-origin', async function () {
    await agent
      .get(`members/stripe_connect`)
      .header('Origin', '')
      .header('Referer', '')
      .expectStatus(403);
  });
});
