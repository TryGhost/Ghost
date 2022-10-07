const should = require('should');
const BaseModel = require('../../../core/server/models/base');
const {Label} = require('../../../core/server/models/label');
const {Product} = require('../../../core/server/models/product');
const {Member} = require('../../../core/server/models/member');
const {MemberStripeCustomer} = require('../../../core/server/models/member-stripe-customer');
const {StripeCustomerSubscription} = require('../../../core/server/models/stripe-customer-subscription');

const testUtils = require('../../utils');
const {StripeProduct} = require('../../../core/server/models/stripe-product');
const {StripePrice} = require('../../../core/server/models/stripe-price');

describe('Member Model', function run() {
    before(testUtils.teardownDb);
    beforeEach(testUtils.setup('roles'));
    afterEach(testUtils.teardownDb);

    describe('stripeSubscriptions', function () {
        it('It is correctly mapped to all a members subscriptions, regardless of customer', async function () {
            const context = testUtils.context.admin;
            await Member.add({
                email: 'test@test.member',
                labels: []
            }, context);
            const member = await Member.findOne({
                email: 'test@test.member'
            }, context);

            should.exist(member, 'Member should have been created');

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

            await MemberStripeCustomer.add({
                member_id: member.get('id'),
                customer_id: 'fake_customer_id1'
            }, context);

            await MemberStripeCustomer.add({
                member_id: member.get('id'),
                customer_id: 'fake_customer_id2'
            }, context);

            await StripeCustomerSubscription.add({
                customer_id: 'fake_customer_id1',
                subscription_id: 'fake_subscription_id1',
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

            await StripeCustomerSubscription.add({
                customer_id: 'fake_customer_id2',
                subscription_id: 'fake_subscription_id2',
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

            const memberWithRelations = await Member.findOne({
                email: 'test@test.member'
            }, Object.assign({
                withRelated: [
                    'stripeSubscriptions',
                    'stripeSubscriptions.customer'
                ]
            }, context));

            const subscriptions = memberWithRelations.related('stripeSubscriptions').toJSON();

            const subscription1 = subscriptions.find(({id}) => id === 'fake_subscription_id1');
            const subscription2 = subscriptions.find(({id}) => id === 'fake_subscription_id2');

            should.exist(subscription1);
            should.exist(subscription2);
        });
    });

    describe('stripeCustomers', function () {
        it('Is correctly mapped to the stripe customers', async function () {
            const context = testUtils.context.admin;
            await Member.add({
                email: 'test@test.member',
                stripeCustomers: [{
                    customer_id: 'fake_customer_id1'
                }]
            }, context);

            const customer1 = await MemberStripeCustomer.findOne({
                customer_id: 'fake_customer_id1'
            }, context);

            should.exist(customer1, 'MemberStripeCustomer should have been created');

            await MemberStripeCustomer.add({
                member_id: customer1.get('member_id'),
                customer_id: 'fake_customer_id2'
            }, context);

            const member = await Member.findOne({
                email: 'test@test.member'
            }, Object.assign({}, context, {
                withRelated: ['stripeCustomers']
            }));

            should.exist(member.related('stripeCustomers'), 'Member should have been fetched with stripeCustomers');

            const stripeCustomers = member.related('stripeCustomers');

            should.equal(stripeCustomers.length, 2, 'Should  be two stripeCustomers');

            should.equal(stripeCustomers.models[0].get('customer_id'), 'fake_customer_id1');
            should.equal(stripeCustomers.models[1].get('customer_id'), 'fake_customer_id2');
        });
    });

    describe('destroy', function () {
        it('Cascades to members_labels, members_stripe_customers & members_stripe_customers_subscriptions', async function () {
            const context = testUtils.context.admin;
            await Member.add({
                email: 'test@test.member',
                labels: [{
                    name: 'A label',
                    slug: 'a-unique-slug-for-testing-members-model'
                }]
            }, context);
            const member = await Member.findOne({
                email: 'test@test.member'
            }, context);

            should.exist(member, 'Member should have been created');

            const label = await Label.findOne({
                slug: 'a-unique-slug-for-testing-members-model'
            }, context);

            should.exist(label, 'Label should have been created');

            const memberLabel = await BaseModel.knex('members_labels').where({
                label_id: label.get('id'),
                member_id: member.get('id')
            }).select().first();

            should.exist(memberLabel, 'Label should have been attached to member');

            await MemberStripeCustomer.add({
                member_id: member.get('id'),
                customer_id: 'fake_customer_id'
            }, context);

            const customer = await MemberStripeCustomer.findOne({
                member_id: member.get('id')
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

            await Member.destroy(Object.assign({
                id: member.get('id')
            }, context));

            const memberAfterDestroy = await Member.findOne({
                email: 'test@test.member'
            });
            should.not.exist(memberAfterDestroy, 'Member should have been destroyed');

            const memberLabelAfterDestroy = await BaseModel.knex('members_labels').where({
                label_id: label.get('id'),
                member_id: member.get('id')
            }).select().first();
            should.not.exist(memberLabelAfterDestroy, 'Label should have been removed from member');

            const customerAfterDestroy = await MemberStripeCustomer.findOne({
                member_id: member.get('id')
            });
            should.not.exist(customerAfterDestroy, 'MemberStripeCustomer should have been destroyed');

            const subscriptionAfterDestroy = await StripeCustomerSubscription.findOne({
                customer_id: customer.get('customer_id')
            });
            should.not.exist(subscriptionAfterDestroy, 'StripeCustomerSubscription should have been destroyed');
        });
    });

    describe('findAll', function () {
        beforeEach(testUtils.setup('members'));

        it('can use search query', function (done) {
            Member.findAll({search: 'egg'}).then(function (queryResult) {
                queryResult.length.should.equal(1);
                queryResult.models[0].get('name').should.equal('Mr Egg');
                done();
            }).catch(done);
        });
    });

    describe('products', function () {
        it('Products can be created & added to members by the product array', async function () {
            const context = testUtils.context.admin;
            const product = await Product.add({
                name: 'Product-Add-Test',
                type: 'paid'
            });
            const member = await Member.add({
                email: 'testing-products@test.member',
                products: [{
                    id: product.id
                }, {
                    name: 'Product-Create-Test',
                    type: 'paid'
                }]
            }, {
                ...context,
                withRelated: ['products']
            });

            const createdProduct = await Product.findOne({
                name: 'Product-Create-Test'
            }, context);

            should.exist(createdProduct, 'Product should have been created');

            const products = member.related('products').toJSON();

            should.exist(
                products.find(model => model.name === 'Product-Create-Test')
            );

            should.exist(
                products.find(model => model.name === 'Product-Add-Test')
            );
        });
    });

    describe('Filtering on products', function () {
        it('Should allow filtering on products', async function () {
            const context = testUtils.context.admin;

            await Member.add({
                email: 'filter-test@test.member',
                products: [{
                    name: 'VIP',
                    slug: 'vip',
                    type: 'paid'
                }]
            }, context);

            const member = await Member.findOne({
                email: 'filter-test@test.member'
            }, context);

            should.exist(member, 'Member should have been created');

            const product = await Product.findOne({
                slug: 'vip'
            }, context);

            should.exist(product, 'Product should have been created');

            const memberProduct = await BaseModel.knex('members_products').where({
                product_id: product.get('id'),
                member_id: member.get('id')
            }).select().first();

            should.exist(memberProduct, 'Product should have been attached to member');

            const vipProductMembers = await Member.findPage({filter: 'products:vip'});
            const foundMemberInVIP = vipProductMembers.data.find(model => model.id === member.id);

            should.exist(foundMemberInVIP, 'Member should have been included in products filter');

            const podcastProductMembers = await Member.findPage({filter: 'products:podcast'});
            const foundMemberInPodcast = podcastProductMembers.data.find(model => model.id === member.id);

            should.not.exist(foundMemberInPodcast, 'Member should not have been included in products filter');
        });
    });

    describe('Filtering', function () {
        it('Should allow filtering on name', async function () {
            const context = testUtils.context.admin;

            await Member.add({
                name: 'Name Filter Test',
                email: 'name-filter-test@test.member',
                products: [{
                    name: 'VIP',
                    slug: 'vip',
                    type: 'paid'
                }]
            }, context);

            const member = await Member.findOne({
                email: 'name-filter-test@test.member'
            }, context);

            should.exist(member, 'Member should have been created');

            const membersByName = await Member.findPage({filter: `name:'Name Filter Test'`});
            const foundMember = membersByName.data.find(model => model.id === member.id);

            should.exist(foundMember, 'Member should have been included in name filter');
        });

        it('Should allow filtering on email', async function () {
            const context = testUtils.context.admin;

            await Member.add({
                email: 'email-filter-test@test.member',
                products: [{
                    name: 'VIP',
                    slug: 'vip',
                    type: 'paid'
                }]
            }, context);

            const member = await Member.findOne({
                email: 'email-filter-test@test.member'
            }, context);

            should.exist(member, 'Member should have been created');

            const membersByName = await Member.findPage({filter: `email:email-filter-test@test.member`});
            const foundMember = membersByName.data.find(model => model.id === member.id);

            should.exist(foundMember, 'Member should have been included in name filter');
        });

        it('Should allow filtering on subscriptions', async function () {
            const context = testUtils.context.admin;

            const member = await Member.add({
                email: 'test@test.member',
                labels: []
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

            await MemberStripeCustomer.add({
                member_id: member.get('id'),
                customer_id: 'fake_customer_id1'
            }, context);

            await MemberStripeCustomer.add({
                member_id: member.get('id'),
                customer_id: 'fake_customer_id2'
            }, context);

            const subscription1 = await StripeCustomerSubscription.add({
                customer_id: 'fake_customer_id1',
                subscription_id: 'fake_subscription_id1',
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

            const subscription2 = await StripeCustomerSubscription.add({
                customer_id: 'fake_customer_id2',
                subscription_id: 'fake_subscription_id2',
                plan_id: 'fake_plan_id',
                stripe_price_id: 'fake_plan_id',
                plan_amount: 1337,
                plan_nickname: 'e-LEET',
                plan_interval: 'year',
                plan_currency: 'btc',
                status: 'canceled',
                start_date: new Date(),
                current_period_end: new Date(),
                cancel_at_period_end: false
            }, context);

            {
                const members = await Member.findPage({filter: `subscriptions.status:canceled+subscriptions.status:-active`});
                should.equal(members.data.length, 0, 'Can search for members with canceled subscription and no active ones');
            }

            await StripeCustomerSubscription.edit({
                status: 'canceled'
            }, {
                id: subscription1.id,
                ...context
            });

            {
                const members = await Member.findPage({filter: `subscriptions.status:canceled+subscriptions.status:-active`});
                should.equal(members.data.length, 1, 'Can search for members with canceled subscription and no active ones');
            }

            {
                const members = await Member.findPage({filter: `subscriptions.plan_interval:year`});
                should.equal(members.data.length, 1, 'Can search for members by plan_interval');
            }

            await StripeCustomerSubscription.edit({
                plan_interval: 'month'
            }, {
                id: subscription2.id,
                ...context
            });

            {
                const members = await Member.findPage({filter: `subscriptions.plan_interval:month+subscriptions.plan_interval:-year`});
                should.equal(members.data.length, 0, 'Can search for members by plan_interval');
            }
        });
    });
});

