const should = require('should');
const stripeConnect = require('../../../../../core/server/services/members/stripe-connect');

describe('Members - Stripe Connect', function () {
    it('getStripeConnectOAuthUrl returns the correct url and sets the necessary state on session and url', async function () {
        const session = new Map();
        const setSessionProp = session.set.bind(session);

        /** @type URL */
        const url = await stripeConnect.getStripeConnectOAuthUrl(setSessionProp);

        should.ok(url instanceof URL, 'getStripeConnectOAuthUrl should return an instance of URL');

        should.exist(session.get(stripeConnect.STATE_PROP), 'The session should have a state set');

        should.equal(url.origin, 'https://connect.stripe.com');
        should.equal(url.pathname, '/oauth/authorize');

        should.equal(url.searchParams.get('response_type'), 'code');
        should.equal(url.searchParams.get('scope'), 'read_write');
        should.equal(url.searchParams.get('state'), session.get(stripeConnect.STATE_PROP));
    });

    it('getStripeConnectTokenData returns token data when the state is correct', async function () {
        const getSessionProp = () => 'correct_state';

        const data = {
            p: 'publishable_stripe_key',
            a: 'access_token',
            l: 'livemode',
            s: 'correct_state'
        };

        const encodedData = Buffer.from(JSON.stringify(data)).toString('base64');

        const tokenData = await stripeConnect.getStripeConnectTokenData(encodedData, getSessionProp);

        should.equal(tokenData.public_key, data.p);
        should.equal(tokenData.secret_key, data.a);
        should.equal(tokenData.livemode, data.l);
    });

    it('getStripeConnectTokenData throws when the state is incorrect', async function () {
        const getSessionProp = () => 'incorrect_state';

        const data = {
            p: 'publishable_stripe_key',
            a: 'access_token',
            l: 'livemode',
            s: 'correct_state'
        };

        const encodedData = Buffer.from(JSON.stringify(data)).toString('base64');

        await stripeConnect.getStripeConnectTokenData(encodedData, getSessionProp).then(() => {
            throw new Error('The token data should not be returned if the state is incorrect');
        }, (error) => {
            should.ok(error);
        });
    });
});
