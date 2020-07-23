const should = require('should');
const BaseModel = require('../../../core/server/models/base');
const {Member} = require('../../../core/server/models/member');
const {MemberStripeCustomer} = require('../../../core/server/models/member-stripe-customer');
const {StripeCustomerSubscription} = require('../../../core/server/models/stripe-customer-subscription');

const testUtils = require('../../utils');

describe('MemberStripeCustomer Model', function run() {
    before(testUtils.teardownDb);
    beforeEach(testUtils.setup('roles'));
    afterEach(testUtils.teardownDb);

    describe('subscriptions', function () {
        // For some reason the initial .add of MemberStripeCustomer is **not** adding a StripeCustomerSubscription :(
        it.skip('Is correctly mapped to the stripe subscriptions', async function () {
            const context = testUtils.context.admin;
            await MemberStripeCustomer.add({
                member_id: 'fake_member_id',
                customer_id: 'fake_customer_id',
                subscriptions: [{
                    subscription_id: 'fake_subscription_id1',
                    plan_id: 'fake_plan_id',
                    plan_amount: 1337,
                    plan_nickname: 'e-LEET',
                    plan_interval: 'year',
                    plan_currency: 'btc',
                    status: 'active',
                    start_date: new Date(),
                    current_period_end: new Date(),
                    cancel_at_period_end: false
                }]
            }, context);

            const subscription1 = await StripeCustomerSubscription.findOne({
                subscription_id: 'fake_subscription_id1'
            }, context);

            should.exist(subscription1, 'StripeCustomerSubscription should have been created');

            await StripeCustomerSubscription.add({
                customer_id: 'fake_customer_id',
                subscription_id: 'fake_subscription_id2',
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

            const customer = await MemberStripeCustomer.findOne({
                customer_id: 'fake_customer_id'
            }, Object.assign({}, context, {
                withRelated: ['subscriptions']
            }));

            should.exist(customer.related('subscriptions'), 'MemberStripeCustomer should have been fetched with subscriptions');

            const subscriptions = customer.related('subscriptions');

            should.equal(subscriptions.length, 2, 'Should  be two subscriptions');

            should.equal(subscriptions.models[0].get('subscription_id'), 'fake_subscription_id1');
            should.equal(subscriptions.models[1].get('subscription_id'), 'fake_subscription_id2');
        });
    });

    describe('member', function () {
        it('Is correctly mapped to the member', async function () {
            const context = testUtils.context.admin;
            await Member.add({
                id: 'fake_member_id',
                email: 'test@test.member'
            }, context);

            await MemberStripeCustomer.add({
                member_id: 'fake_member_id',
                customer_id: 'fake_customer_id'
            }, context);

            const customer = await MemberStripeCustomer.findOne({
                customer_id: 'fake_customer_id'
            }, Object.assign({}, context, {
                withRelated: ['member']
            }));

            const member = customer.related('member');

            should.exist(member, 'MemberStripeCustomer should have been fetched with member');

            should.equal(member.get('id'), 'fake_member_id');
            should.equal(member.get('email'), 'test@test.member');
        });
    });

    describe('destroy', function () {
        it('Cascades to members_stripe_customers_subscriptions', async function () {
            const context = testUtils.context.admin;
            await MemberStripeCustomer.add({
                member_id: 'fake_member_id',
                customer_id: 'fake_customer_id'
            }, context);

            const customer = await MemberStripeCustomer.findOne({
                member_id: 'fake_member_id'
            }, context);

            should.exist(customer, 'Customer should have been created');

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
                customer_id: customer.get('customer_id')
            }, context);

            should.exist(subscription, 'Subscription should have been created');

            await MemberStripeCustomer.destroy(Object.assign({
                id: customer.get('id')
            }, context));

            const customerAfterDestroy = await MemberStripeCustomer.findOne({
                member_id: 'fake_member_id'
            });
            should.not.exist(customerAfterDestroy, 'MemberStripeCustomer should have been destroyed');

            const subscriptionAfterDestroy = await StripeCustomerSubscription.findOne({
                customer_id: customer.get('customer_id')
            });
            should.not.exist(subscriptionAfterDestroy, 'StripeCustomerSubscription should have been destroyed');
        });
    });
});

