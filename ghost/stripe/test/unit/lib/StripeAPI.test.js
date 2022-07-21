const sinon = require('sinon');
const should = require('should');
const rewire = require('rewire');
const StripeAPI = rewire('../../../lib/StripeAPI');
const api = new StripeAPI();

describe('StripeAPI', function () {
    let mockStripe;
    beforeEach(function () {
        mockStripe = {
            checkout: {
                sessions: {
                    create: sinon.stub().resolves()
                }
            }
        };
        const mockStripeConstructor = sinon.stub().returns(mockStripe);
        StripeAPI.__set__('Stripe', mockStripeConstructor);
        api.configure({
            checkoutSessionSuccessUrl: '/success',
            checkoutSessionCancelUrl: '/cancel',
            checkoutSetupSessionSuccessUrl: '/setup-success',
            checkoutSetupSessionCancelUrl: '/setup-cancel',
            secretKey: ''
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('createCheckoutSession sends success_url and cancel_url', async function (){
        await api.createCheckoutSession('priceId', null, {});

        should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.success_url);
        should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.cancel_url);
    });

    it('createCheckoutSetupSession sends success_url and cancel_url', async function (){
        await api.createCheckoutSetupSession('priceId', {});

        should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.success_url);
        should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.cancel_url);
    });
});
