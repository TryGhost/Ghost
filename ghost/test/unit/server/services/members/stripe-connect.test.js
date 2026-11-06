const assert = require('node:assert/strict');
const sinon = require('sinon');
const { assertExists } = require('../../../../utils/assertions');
const stripeConnect = require('../../../../../core/server/services/members/stripe-connect');
const urlUtils = require('../../../../../core/shared/url-utils').default;

describe('Members - Stripe Connect', function () {
  it('getStripeConnectOAuthUrl returns the correct url and sets the necessary state on session and url', async function () {
    const session = new Map();
    const setSessionProp = session.set.bind(session);

    /** @type URL */
    const url = await stripeConnect.getStripeConnectOAuthUrl(setSessionProp);

    assert(url instanceof URL, 'getStripeConnectOAuthUrl should return an instance of URL');

    assertExists(session.get(stripeConnect.STATE_PROP), 'The session should have a state set');

    assert.equal(url.origin, 'https://connect.stripe.com');
    assert.equal(url.pathname, '/oauth/authorize');

    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(url.searchParams.get('scope'), 'read_write');
    assert.equal(url.searchParams.get('state'), session.get(stripeConnect.STATE_PROP));
  });

  it('getStripeConnectOAuthUrl returns to account.ghost.org, naming the site in the state', async function () {
    const session = new Map();
    const url = await stripeConnect.getStripeConnectOAuthUrl(session.set.bind(session), 'test');

    const state = JSON.parse(Buffer.from(url.searchParams.get('state'), 'base64').toString());

    assert.equal(state.mode, 'test');
    assert.match(state.randomState, /^[0-9a-f]{32}$/);
    assert.equal(state.site, urlUtils.getSiteUrl());
    assert.equal(url.searchParams.get('redirect_uri'), 'https://account.ghost.org/oauth/stripe');
  });

  // A session that started a connection in `mode`, and a secure key for it.
  async function startConnection(mode = 'live') {
    const session = new Map();
    await stripeConnect.getStripeConnectOAuthUrl(session.set.bind(session), mode);
    const state = session.get(stripeConnect.STATE_PROP);
    const key = (fields = {}) =>
      Buffer.from(
        JSON.stringify({
          l: mode === 'live',
          a: 'sk_connected',
          p: 'pk_connected',
          s: state,
          n: 'Rediverge',
          i: 'acct_1',
          ...fields,
        }),
      ).toString('base64');
    return { getSessionProp: (prop) => session.get(prop), key };
  }

  const rejects = (promise) =>
    promise.then(
      () => {
        throw new Error('The token data should not be returned');
      },
      (error) => assert.equal(error.errorType, 'NoPermissionError'),
    );

  it('getStripeConnectTokenData returns token data when the state is correct', async function () {
    const { getSessionProp, key } = await startConnection('live');

    const tokenData = await stripeConnect.getStripeConnectTokenData(key(), getSessionProp);

    assert.deepEqual(tokenData, {
      public_key: 'pk_connected',
      secret_key: 'sk_connected',
      livemode: true,
      display_name: 'Rediverge',
      account_id: 'acct_1',
    });
  });

  it('getStripeConnectTokenData throws when the state is incorrect', async function () {
    const { getSessionProp, key } = await startConnection();

    await rejects(stripeConnect.getStripeConnectTokenData(key({ s: 'other' }), getSessionProp));
  });

  it('getStripeConnectTokenData throws for a key without a state when no connection started', async function () {
    const { key } = await startConnection();

    await rejects(stripeConnect.getStripeConnectTokenData(key({ s: undefined }), () => undefined));
  });

  it('getStripeConnectTokenData throws an hour after the connection started', async function () {
    const clock = sinon.useFakeTimers({ now: Date.now(), toFake: ['Date'] });
    try {
      const { getSessionProp, key } = await startConnection();
      clock.tick(60 * 60 * 1000);

      await rejects(stripeConnect.getStripeConnectTokenData(key(), getSessionProp));
    } finally {
      clock.restore();
    }
  });

  it('getStripeConnectTokenData throws for a test-mode account in a live-mode connection', async function () {
    const { getSessionProp, key } = await startConnection('live');

    await rejects(stripeConnect.getStripeConnectTokenData(key({ l: false }), getSessionProp));
  });
});
