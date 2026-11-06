const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const { Buffer } = require('buffer');
const { randomBytes } = require('crypto');

const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils').default;

const messages = {
  incorrectState: 'State did not match.',
  expiredState: 'This Stripe connection has expired.',
  incorrectMode: 'The Stripe account is not in the mode this connection started in.',
};

// How long after the admin clicks Connect the secure key is accepted.
const STATE_MAX_AGE_MS = 60 * 60 * 1000;

const STATE_PROP = 'stripe-connect-state';

const liveClientID = 'ca_8LBuZWhYshxF0A55KgCXu8PRTquCKC5x';
const testClientID = 'ca_8LBum4Ctv3mmJ1oD0ZRmxjdAhNrrBUy3';
// account.ghost.org's Connect page, which delivers the secure key to this
// site's Ghost Admin. Older Ghost versions send users to stripe.ghost.org.
const redirectURI = 'https://account.ghost.org/oauth/stripe';

/**
 * @function getStripeConnectOAuthUrl
 * @desc Returns a url for the auth endpoint for Stripe Connect, generates state and stores it on the session.
 *
 * @param {(prop: string, val: any) => Promise<void>} setSessionProp - A function to set data on the current session
 * @param {'live' | 'test'} mode - Which stripe mode to set up
 *
 * @returns {Promise<URL>}
 */
async function getStripeConnectOAuthUrl(setSessionProp, mode = 'live') {
  checkCanConnect();
  const randomState = randomBytes(16).toString('hex');
  const state = Buffer.from(
    JSON.stringify({
      mode,
      randomState,
      createdAt: Date.now(),
      // Lets account.ghost.org offer this site among the user's saved sites.
      // The user still confirms the site there.
      site: urlUtils.getSiteUrl(),
    }),
  ).toString('base64');

  await setSessionProp(STATE_PROP, state);

  const clientID = mode === 'live' ? liveClientID : testClientID;

  const authUrl = new URL('https://connect.stripe.com/oauth/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'read_write');
  authUrl.searchParams.set('client_id', clientID);
  authUrl.searchParams.set('redirect_uri', redirectURI);
  authUrl.searchParams.set('state', state);

  return authUrl;
}

/**
 * @function getStripeConnectTokenData
 * @desc Returns the api keys and the livemode for a Stripe Connect integration after validating the state.
 *
 * @param {string} encodedData - A string encoding the response from Stripe Connect
 * @param {(prop: string) => Promise<any>} getSessionProp - A function to retrieve data from the current session.
 *   The state is only good for one key, so callers should remove it as they read it.
 *
 * @returns {Promise<{secret_key: string, public_key: string, livemode: boolean, display_name: string, account_id: string}>}
 */
async function getStripeConnectTokenData(encodedData, getSessionProp) {
  const data = JSON.parse(Buffer.from(encodedData, 'base64').toString());

  const state = await getSessionProp(STATE_PROP);

  // Both must be present: a session that never started a connection must not
  // match a key without `s`.
  if (typeof state !== 'string' || !state || state !== data.s) {
    throw new errors.NoPermissionError({ message: tpl(messages.incorrectState) });
  }

  const { mode, createdAt } = JSON.parse(Buffer.from(state, 'base64').toString());
  if (!(Date.now() - createdAt < STATE_MAX_AGE_MS)) {
    throw new errors.NoPermissionError({ message: tpl(messages.expiredState) });
  }
  if (data.l !== (mode === 'live')) {
    throw new errors.NoPermissionError({ message: tpl(messages.incorrectMode) });
  }

  return {
    public_key: data.p,
    secret_key: data.a,
    livemode: data.l,
    display_name: data.n,
    account_id: data.i,
  };
}

function checkCanConnect() {
  const siteUrl = urlUtils.getSiteUrl();
  const productionMode = config.get('env') === 'production';
  const siteUrlUsingSSL = /^https/.test(siteUrl);
  const cannotConnectToStripe = productionMode && !siteUrlUsingSSL;
  if (cannotConnectToStripe) {
    throw new errors.BadRequestError({
      message: 'Cannot connect to stripe unless site is using https://',
    });
  }
}

module.exports = {
  getStripeConnectOAuthUrl,
  getStripeConnectTokenData,
  STATE_PROP,
};
