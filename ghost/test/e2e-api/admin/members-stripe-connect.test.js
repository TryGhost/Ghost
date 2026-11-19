const assert = require('node:assert/strict');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');

const { isBetterAuth } = require('../../../core/server/auth');

describe('Members Stripe Connect API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
    await agent.loginAsOwner();
  });

  async function startConnect() {
    let state;
    await agent
      .get('members/stripe_connect?mode=test')
      .expectStatus(302)
      .expectEmptyBody()
      .expect(({ headers }) => {
        const location = new URL(headers.location);
        assert.equal(
          `${location.origin}${location.pathname}`,
          'https://connect.stripe.com/oauth/authorize',
        );
        assert.equal(location.searchParams.get('response_type'), 'code');
        assert.equal(location.searchParams.get('scope'), 'read_write');
        state = location.searchParams.get('state');
        assert.ok(state);

        // Legacy keeps the state on the session; Better Auth in verifications
        const cookies = [headers['set-cookie'] ?? []].flat();
        assert.equal(
          cookies.some((cookie) => cookie.startsWith('ghost-admin-api-session=')),
          !isBetterAuth,
        );
      });
    return state;
  }

  const token = (s) =>
    Buffer.from(
      JSON.stringify({
        s,
        p: 'pk_test_stripeConnect',
        a: 'sk_test_stripeConnect',
        l: false,
        n: 'Test Account',
        i: 'acct_stripeConnect',
      }),
    ).toString('base64');

  const save = (s) =>
    agent.put('settings/').body({
      settings: [{ key: 'stripe_connect_integration_token', value: token(s) }],
    });

  const expectConnected = (request) =>
    request.expectStatus(200).expect(({ body }) => {
      const key = body.settings.find((s) => s.key === 'stripe_connect_publishable_key');
      assert.equal(key.value, 'pk_test_stripeConnect');
    });

  it('can do auth', async function () {
    await startConnect();
  });

  afterEach(function () {
    mockManager.restore();
  });

  it('keeps the state after a mismatch', async function () {
    const state = await startConnect();

    await save('not-the-state').expectStatus(400);
    await expectConnected(save(state));
  });

  it('keeps the state when saving fails, so the same token can be retried', async function () {
    const state = await startConnect();

    mockManager.mockLimitService('limitStripeConnect', {
      isLimited: true,
      errorIfWouldGoOverLimit: true,
    });
    await save(state).expectStatus(403);

    mockManager.restore();
    await expectConnected(save(state));
  });

  describe('with a staff token beside the session cookie', function () {
    afterEach(async function () {
      await agent.loginAsOwner();
    });

    it(
      isBetterAuth ? 'starts the flow for the token user' : 'needs the session, which a key skips',
      async function () {
        await agent.useStaffTokenForOwner();
        const authorization = agent.defaults.headers.Authorization;
        await agent.loginAsOwner();
        agent.defaults.headers.Authorization = authorization;

        const request = agent.get('members/stripe_connect?mode=test');
        if (isBetterAuth) {
          await request.expectStatus(302);
        } else {
          await request.expectStatus(403).expect(({ body }) => {
            assert.match(body.errors[0].message, /signed-in staff session/);
          });
        }
      },
    );
  });
});
