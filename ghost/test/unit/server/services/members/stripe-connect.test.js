const assert = require('node:assert/strict');
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

  it('getStripeConnectTokenData returns token data when the state is correct', async function () {
    const getSessionProp = () => 'correct_state';

    const data = {
      p: 'publishable_stripe_key',
      a: 'access_token',
      l: 'livemode',
      s: 'correct_state',
    };

    const encodedData = Buffer.from(JSON.stringify(data)).toString('base64');

    const tokenData = await stripeConnect.getStripeConnectTokenData(encodedData, getSessionProp);

    assert.equal(tokenData.public_key, data.p);
    assert.equal(tokenData.secret_key, data.a);
    assert.equal(tokenData.livemode, data.l);
  });

  it('getStripeConnectTokenData throws when the state is incorrect', async function () {
    const getSessionProp = () => 'incorrect_state';

    const data = {
      p: 'publishable_stripe_key',
      a: 'access_token',
      l: 'livemode',
      s: 'correct_state',
    };

    const encodedData = Buffer.from(JSON.stringify(data)).toString('base64');

    await stripeConnect.getStripeConnectTokenData(encodedData, getSessionProp).then(
      () => {
        throw new Error('The token data should not be returned if the state is incorrect');
      },
      (error) => {
        assert(error);
      },
    );
  });
});
