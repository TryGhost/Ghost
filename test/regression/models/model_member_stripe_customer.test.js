const should = require('should');
const BaseModel = require('../../../core/server/models/base');
const {Member} = require('../../../core/server/models/member');
const {MemberStripeCustomer} = require('../../../core/server/models/member-stripe-customer');
const {Product} = require('../../../core/server/models/product');
const {StripeCustomerSubscription} = require('../../../core/server/models/stripe-customer-subscription');
const {StripePrice} = require('../../../core/server/models/stripe-price');
const {StripeProduct} = require('../../../core/server/models/stripe-product');

const testUtils = require('../../utils');

describe('MemberStripeCustomer Model', function run() {
    before(testUtils.teardownDb);
    beforeEach(testUtils.setup('roles'));
    afterEach(testUtils.teardownDb);

    describe('subscriptions', function () {
        it('Is correctly mapped to the stripe subscriptions', async function () {
            const context = testUtils.context.admin;

            const member = await Member.add({
                email: 'test@test.test'
            });

            const product = await Product.add({
                name: 'Ghost Product',
                slug: 'ghost-product',
                type: 'paid'
            }, context);

            await StripeProduct.add({
                product_id: product.get('id'),
                stripe_product_id: 'fake_product_id'
            }, context);

            await StripePrice.add({
                stripe_price_id: 'fake_plan_id',
                stripe_product_id: 'fake_product_id',
                amount: 5000,
                interval: 'monthly',
                currency: 'USD',
                active: 1,
                nickname: 'Monthly',
                type: 'recurring'
            }, context);

            await MemberStripeCustomer.add({
                member_id: member.get('id'),
                customer_id: 'fake_customer_id'
            }, context);

            await StripeCustomerSubscription.add({
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
                cancel_at_period_end: false
            }, context);

            const customer = await MemberStripeCustomer.findOne({
                customer_id: 'fake_customer_id'
            }, Object.assign({}, context, {
                withRelated: ['subscriptions']
            }));

            should.exist(customer.related('subscriptions'), 'MemberStripeCustomer should have been fetched with subscriptions');

            const subscriptions = customer.related('subscriptions');

            should.equal(subscriptions.length, 1, 'Should  be two subscriptions');

            should.equal(subscriptions.models[0].get('subscription_id'), 'fake_subscription_id');
        });
    });

    describe('member', function () {
        it('Is correctly mapped to the member', async function () {
            const context = testUtils.context.admin;
            const member = await Member.add({
                email: 'test@test.member'
            }, context);

            await MemberStripeCustomer.add({
                member_id: member.get('id'),
                customer_id: 'fake_customer_id'
            }, context);

            const customer = await MemberStripeCustomer.findOne({
                customer_id: 'fake_customer_id'
            }, Object.assign({}, context, {
                withRelated: ['member']
            }));

            const memberFromRelation = customer.related('member');

            should.exist(memberFromRelation, 'MemberStripeCustomer should have been fetched with member');

            should.equal(memberFromRelation.get('id'), member.get('id'));
            should.equal(memberFromRelation.get('email'), 'test@test.member');
        });
    });

    describe('destroy', function () {
        it('Cascades to members_stripe_customers_subscriptions', async function () {
            const context = testUtils.context.admin;
            const member = await Member.add({
                email: 'test@test.member'
            }, context);

            await MemberStripeCustomer.add({
                member_id: member.get('id'),
                customer_id: 'fake_customer_id'
            }, context);

            const customer = await MemberStripeCustomer.findOne({
                customer_id: 'fake_customer_id'
            }, context);

            should.exist(customer, 'Customer should have been created');

            const product = await Product.add({
                name: 'Ghost Product',
                slug: 'ghost-product',
                type: 'paid'
            }, context);

            await StripeProduct.add({
                product_id: product.get('id'),
                stripe_product_id: 'fake_product_id'
            }, context);

            await StripePrice.add({
                stripe_price_id: 'fake_plan_id',
                stripe_product_id: 'fake_product_id',
                amount: 5000,
                interval: 'monthly',
                active: 1,
                nickname: 'Monthly',
                currency: 'USD',
                type: 'recurring'
            }, context);

            await StripeCustomerSubscription.add({
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
                customer_id: 'fake_customer_id'
            });
            should.not.exist(customerAfterDestroy, 'MemberStripeCustomer should have been destroyed');

            const subscriptionAfterDestroy = await StripeCustomerSubscription.findOne({
                customer_id: 'fake_customer_id'
            });
            should.not.exist(subscriptionAfterDestroy, 'StripeCustomerSubscription should have been destroyed');
        });
    });
});

