const should = require('should');
const {MemberStripeCustomer} = require('../../../core/server/models/member-stripe-customer');
const {StripeCustomerSubscription} = require('../../../core/server/models/stripe-customer-subscription');

const testUtils = require('../../utils');

describe('StripeCustomerSubscription Model', function run() {
    before(testUtils.teardownDb);
    beforeEach(testUtils.setup('roles'));
    afterEach(testUtils.teardownDb);

    describe('customer', function () {
        it('Is correctly mapped to the stripe customer', async function () {
            const context = testUtils.context.admin;
            await MemberStripeCustomer.add({
                member_id: 'fake_member_id',
                customer_id: 'fake_customer_id'
            }, context);

            await StripeCustomerSubscription.add({
                customer_id: 'fake_customer_id',
                subscription_id: 'fake_subscription_id',
                plan_id: 'fake_plan_id',
                plan_amount: 1337,
                plan_nickname: 'e-LEET',
                plan_interval: 'year',
                plan_currency: 'btc',
                status: 'active',
                start_date: new Date(),
                current_period_end: new Date(),
                cancel_at_period_end: false
            }, context);

            const subscription = await StripeCustomerSubscription.findOne({
                subscription_id: 'fake_subscription_id'
            }, Object.assign({}, context, {
                withRelated: ['customer']
            }));

            const customer = subscription.related('customer');

            should.exist(customer, 'StripeCustomerSubscription should have been fetched with customer');

            should.equal(customer.get('customer_id'), 'fake_customer_id');
        });
    });
});
