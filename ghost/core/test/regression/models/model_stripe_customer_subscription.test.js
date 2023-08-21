const should = require('should');
const {Member} = require('../../../core/server/models/member');
const {MemberStripeCustomer} = require('../../../core/server/models/member-stripe-customer');
const {Product} = require('../../../core/server/models/product');
const {StripeCustomerSubscription} = require('../../../core/server/models/stripe-customer-subscription');
const {StripePrice} = require('../../../core/server/models/stripe-price');
const {StripeProduct} = require('../../../core/server/models/stripe-product');

const testUtils = require('../../utils');

describe('StripeCustomerSubscription Model', function run() {
    before(testUtils.teardownDb);
    beforeEach(testUtils.setup('roles'));
    afterEach(testUtils.teardownDb);

    describe('customer', function () {
        it('Is correctly mapped to the stripe customer', async function () {
            const context = testUtils.context.admin;
            const member = await Member.add({
                email: 'test@test.member',
                email_disabled: false
            }, context);
            await MemberStripeCustomer.add({
                member_id: member.get('id'),
                customer_id: 'fake_customer_id'
            }, context);

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
