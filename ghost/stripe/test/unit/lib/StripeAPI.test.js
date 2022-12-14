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

    it('createCheckoutSession sets valid trialDays', async function (){
        await api.createCheckoutSession('priceId', null, {
            trialDays: 12
        });

        should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan);
        should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days);
        should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days, 12);
    });

    it('createCheckoutSession uses trial_from_plan without trialDays', async function (){
        await api.createCheckoutSession('priceId', null, {});

        should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan);
        should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan, true);
        should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days);
    });

    it('createCheckoutSession ignores 0 trialDays', async function (){
        await api.createCheckoutSession('priceId', null, {
            trialDays: 0
        });

        should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan);
        should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan, true);
        should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days);
    });

    it('createCheckoutSession ignores null trialDays', async function (){
        await api.createCheckoutSession('priceId', null, {
            trialDays: null
        });

        should.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan);
        should.equal(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_from_plan, true);
        should.not.exist(mockStripe.checkout.sessions.create.firstCall.firstArg.subscription_data.trial_period_days);
    });
});
