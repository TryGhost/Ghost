const should = require('should');
const MembersConfigProvider = require('../../../../core/server/services/members/config');
const urlUtils = require('../../../../core/shared/url-utils');
const sinon = require('sinon');

/**
 * @param {object} options
 * @param {boolean} options.stripeDirectValue - The value the stripeDirect config property should have
 */
function createConfigMock({stripeDirectValue}) {
    return {
        get: sinon.stub()
            .withArgs('stripeDirect').returns(stripeDirectValue)
    };
}

/**
 * @param {object} options
 * @param {boolean} options.setDirect - Whether the "direct" keys should be set
 * @param {boolean} options.setConnect - Whether the connect_integration keys should be set
 */

function createSettingsMock({setDirect, setConnect}) {
    const membersSubscriptionSettings = {
        fromAddress: 'noreply',
        allowSelfSignup: true,
        paymentProcessors: [{
            adapter: 'stripe',
            config: {
                secret_token: setDirect ? 'direct_secret' : null,
                public_token: setDirect ? 'direct_public' : null,
                product: {
                    name: 'Test'
                },
                plans: [{
                    name: 'Monthly',
                    currency: 'usd',
                    interval: 'month',
                    amount: 1000
                }, {
                    name: 'Yearly',
                    currency: 'usd',
                    interval: 'year',
                    amount: 10000
                }]
            }
        }]
    };

    const stripeConnectIntegration = {
        secret_key: setConnect ? 'connect_secret' : null,
        public_key: setConnect ? 'connect_public' : null,
        livemode: true
    };

    const getStub = sinon.stub();

    getStub.withArgs('members_subscription_settings').returns(membersSubscriptionSettings);
    getStub.withArgs('stripe_connect_integration').returns(stripeConnectIntegration);
    return {
        get: getStub
    };
}

describe('Members - config', function () {
    it('Uses direct keys when stripeDirect is true, regardles of which keys exist', function () {
        const config = createConfigMock({stripeDirectValue: true});
        const settingsCache = createSettingsMock({setDirect: true, setConnect: Math.random() < 0.5});

        const membersConfig = new MembersConfigProvider({
            config,
            settingsCache,
            urlUtils,
            ghostVersion: {original: 'v7357'},
            logging: console
        });

        const paymentConfig = membersConfig.getStripePaymentConfig();

        should.equal(paymentConfig.publicKey, 'direct_public');
        should.equal(paymentConfig.secretKey, 'direct_secret');
    });

    it('Does not use connect keys if stripeDirect is true, and the direct keys do not exist', function () {
        const config = createConfigMock({stripeDirectValue: true});
        const settingsCache = createSettingsMock({setDirect: false, setConnect: true});

        const membersConfig = new MembersConfigProvider({
            config,
            settingsCache,
            urlUtils,
            ghostVersion: {original: 'v7357'},
            logging: console
        });

        const paymentConfig = membersConfig.getStripePaymentConfig();

        should.equal(paymentConfig, null);
    });

    it('Uses connect keys when stripeDirect is false, and the connect keys exist', function () {
        const config = createConfigMock({stripeDirectValue: false});
        const settingsCache = createSettingsMock({setDirect: true, setConnect: true});

        const membersConfig = new MembersConfigProvider({
            config,
            settingsCache,
            urlUtils,
            ghostVersion: {original: 'v7357'},
            logging: console
        });

        const paymentConfig = membersConfig.getStripePaymentConfig();

        should.equal(paymentConfig.publicKey, 'connect_public');
        should.equal(paymentConfig.secretKey, 'connect_secret');
    });

    it('Uses direct keys when stripeDirect is false, but the connect keys do not exist', function () {
        const config = createConfigMock({stripeDirectValue: false});
        const settingsCache = createSettingsMock({setDirect: true, setConnect: false});

        const membersConfig = new MembersConfigProvider({
            config,
            settingsCache,
            urlUtils,
            ghostVersion: {original: 'v7357'},
            logging: console
        });

        const paymentConfig = membersConfig.getStripePaymentConfig();

        should.equal(paymentConfig.publicKey, 'direct_public');
        should.equal(paymentConfig.secretKey, 'direct_secret');
    });
});
