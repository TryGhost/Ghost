const should = require('should');
const BaseModel = require('../../../core/server/models/base');
const {Label} = require('../../../core/server/models/label');
const {Member} = require('../../../core/server/models/member');
const {MemberStripeCustomer} = require('../../../core/server/models/member-stripe-customer');
const {StripeCustomerSubscription} = require('../../../core/server/models/stripe-customer-subscription');

const testUtils = require('../../utils');

describe('Member Model', function run() {
    before(testUtils.teardownDb);
    beforeEach(testUtils.setup('roles'));
    afterEach(testUtils.teardownDb);

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

            await BaseModel.transaction(async (transacting) => {
                return await Member.destroy(Object.assign({
                    transacting,
                    id: member.get('id')
                }, context));
            });

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
});

