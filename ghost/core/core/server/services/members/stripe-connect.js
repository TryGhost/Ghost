const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const {Buffer} = require('buffer');
const {randomBytes} = require('crypto');
const {URL} = require('url');

const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');

const messages = {
    incorrectState: 'State did not match.'
};

const STATE_PROP = 'stripe-connect-state';

const liveClientID = 'ca_8LBuZWhYshxF0A55KgCXu8PRTquCKC5x';
const testClientID = 'ca_8LBum4Ctv3mmJ1oD0ZRmxjdAhNrrBUy3';
const redirectURI = 'https://stripe.ghost.org';

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
    const state = Buffer.from(JSON.stringify({
        mode,
        randomState
    })).toString('base64');

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
 * @param {(prop: string) => Promise<any>} getSessionProp - A function to retrieve data from the current session
 *
 * @returns {Promise<{secret_key: string, public_key: string, livemode: boolean, display_name: string, account_id: string}>}
 */
async function getStripeConnectTokenData(encodedData, getSessionProp) {
    const data = JSON.parse(Buffer.from(encodedData, 'base64').toString());

    const state = await getSessionProp(STATE_PROP);

    if (state !== data.s) {
        throw new errors.NoPermissionError({message: tpl(messages.incorrectState)});
    }

    return {
        public_key: data.p,
        secret_key: data.a,
        livemode: data.l,
        display_name: data.n,
        account_id: data.i
    };
}

function checkCanConnect() {
    const siteUrl = urlUtils.getSiteUrl();
    const productionMode = config.get('env') === 'production';
    const siteUrlUsingSSL = /^https/.test(siteUrl);
    const cannotConnectToStripe = productionMode && !siteUrlUsingSSL;
    if (cannotConnectToStripe) {
        throw new errors.BadRequestError({
            message: 'Cannot connect to stripe unless site is using https://'
        });
    }
}

module.exports = {
    getStripeConnectOAuthUrl,
    getStripeConnectTokenData,
    STATE_PROP
};
