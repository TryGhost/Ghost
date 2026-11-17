const assert = require('node:assert/strict');
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

  describe('connecting with the key the session asked for', function () {
    // Starts a connection as Ghost Admin's Connect link does, and returns
    // the state Ghost saved in this session.
    async function startConnection() {
      const res = await agent
        .get(`members/stripe_connect?mode=test`)
        .header('Sec-Fetch-Site', 'same-origin')
        .header('Sec-Fetch-Mode', 'navigate')
        .expectStatus(302);
      return new URL(res.headers.location).searchParams.get('state');
    }
    // The key account.ghost.org (or stripe.ghost.org) hands back, with dummy credentials.
    const secureKey = (state, fields = {}) =>
      Buffer.from(
        JSON.stringify({
          l: false,
          a: 'sk_test_bridge',
          p: 'pk_test_bridge',
          s: state,
          n: 'Bridge Co',
          i: 'acct_bridge',
          ...fields,
        }),
      ).toString('base64');
    const saveKey = (key) =>
      agent
        .put('settings/')
        .body({ settings: [{ key: 'stripe_connect_integration_token', value: key }] });

    afterEach(async function () {
      await agent.delete('/settings/stripe/connect/').expectStatus(204);
    });

    it('saves the key for the connection this session started, and only once', async function () {
      const state = await startConnection();

      const res = await saveKey(secureKey(state)).expectStatus(200);
      const saved = Object.fromEntries(res.body.settings.map(({ key, value }) => [key, value]));
      assert.equal(saved.stripe_connect_account_id, 'acct_bridge');
      assert.equal(saved.stripe_connect_publishable_key, 'pk_test_bridge');

      await saveKey(secureKey(state)).expectStatus(400);
    });

    it('keeps the connection usable after a key it did not ask for, or an incomplete one', async function () {
      const state = await startConnection();

      await saveKey(secureKey('another-connection')).expectStatus(400);
      await saveKey(secureKey(state, { a: '' })).expectStatus(400);
      await saveKey(secureKey(state)).expectStatus(200);
    });
  });

  it('refuses a start that says neither where it came from nor that it is same-origin', async function () {
    await agent
      .get(`members/stripe_connect`)
      .header('Origin', '')
      .header('Referer', '')
      .expectStatus(403);
  });
});
