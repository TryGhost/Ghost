const sinon = require('sinon');
const should = require('should');
const models = require('../../../../core/server/models');

describe('Unit: models/stripe-customer-subscription', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('serialize', function () {
        let serialize;

        beforeEach(function () {
            serialize = function (model, options) {
                return new models.StripeCustomerSubscription(model).serialize(options);
            };
        });

        afterEach(function () {
            sinon.restore();
        });

        it('returns subscription trial start and end details', function () {
            const trialStartAt = new Date();
            const trialEndAt = new Date(Date.now() + 7 * 86400 * 1000); // trial ending 7 days from now
            const stripeSubscription = {
                customer_id: 'fake_customer_id',
                subscription_id: 'fake_subscription_id',
                plan_id: 'fake_plan_id',
                stripe_price_id: 'fake_plan_id',
                plan_amount: 1337,
                plan_nickname: 'e-LEET',
                plan_interval: 'year',
                plan_currency: 'btc',
                status: 'active',
                start_date: new Date(),
                current_period_end: new Date(),
                cancel_at_period_end: false,
                trial_start_at: trialStartAt,
                trial_end_at: trialEndAt
            };

            const json = serialize(stripeSubscription);
            should.exist(json.plan);
            should.exist(json.customer);
            should.exist(json.trial_start_at);
            should.exist(json.trial_end_at);
        });
    });
});
