const {Buffer} = require('buffer');
const {randomBytes} = require('crypto');
const {URL} = require('url');

const STATE_PROP = 'stripe-connect-state';

const clientID = 'ca_8LBuZWhYshxF0A55KgCXu8PRTquCKC5x';
const redirectURI = 'https://stripe.ghost.org';

/**
 * @function getStripeConnectOAuthUrl
 * @desc Returns a url for the auth endpoint for Stripe Connect, generates state and stores it on the session.
 *
 * @param {(prop: string, val: any) => Promise<void>} setSessionProp - A function to set data on the current session
 *
 * @returns {Promise<URL>}
 */
async function getStripeConnectOAuthUrl(setSessionProp) {
    const state = randomBytes(16).toString('hex');

    await setSessionProp(STATE_PROP, state);

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
 * @param {(prop: string) => Promise<any>} getSessionProp - A function to retrieve data from the current session
 *
 * @returns {Promise<{secret_key: string, public_key: string, livemode: boolean}>}
 */
async function getStripeConnectTokenData(encodedData, getSessionProp) {
    const data = JSON.parse(Buffer.from(encodedData, 'base64').toString());

    const state = await getSessionProp(STATE_PROP);

    if (state !== data.s) {
        throw new Error('State did not match');
    }

    return {
        public_key: data.p,
        secret_key: data.a,
        livemode: data.l
    };
}

module.exports = {
    getStripeConnectOAuthUrl,
    getStripeConnectTokenData,
    STATE_PROP
};
