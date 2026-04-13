const assert = require('node:assert/strict');
const testUtils = require('../../utils');
const {Product} = require('../../../core/server/models/product');
const {Offer} = require('../../../core/server/models/offer');
const {OfferRedemption} = require('../../../core/server/models/offer-redemption');
const {Member} = require('../../../core/server/models/member');
const {MemberStripeCustomer} = require('../../../core/server/models/member-stripe-customer');
const {StripeCustomerSubscription} = require('../../../core/server/models/stripe-customer-subscription');
const {StripeProduct} = require('../../../core/server/models/stripe-product');
const {StripePrice} = require('../../../core/server/models/stripe-price');
const OfferBookshelfRepository = require('../../../core/server/services/offers/offer-bookshelf-repository');
const OffersAPI = require('../../../core/server/services/offers/application/offers-api');

describe('OffersAPI', function () {
    before(testUtils.teardownDb);
    beforeEach(testUtils.setup('roles'));
    afterEach(testUtils.teardownDb);

    let context, product, api;

    beforeEach(async function () {
        context = testUtils.context.admin;

        product = await Product.add({
            name: 'Test Product',
            slug: 'test-product',
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

        const repository = new OfferBookshelfRepository(Offer, OfferRedemption);
        api = new OffersAPI(repository);
    });

    async function createMemberWithSubscription() {
        const member = await Member.add({
            email: 'test@offers-api.com',
            labels: [],
            email_disabled: false
        }, context);

        await MemberStripeCustomer.add({
            member_id: member.get('id'),
            customer_id: 'fake_customer_id'
        }, context);

        const subscription = await StripeCustomerSubscription.add({
            customer_id: 'fake_customer_id',
            subscription_id: 'fake_subscription_id',
            plan_id: 'fake_plan_id',
            stripe_price_id: 'fake_plan_id',
            plan_amount: 5000,
            plan_nickname: 'Monthly',
            plan_interval: 'month',
            plan_currency: 'USD',
            status: 'active',
            start_date: new Date(),
            current_period_end: new Date(),
            cancel_at_period_end: false
        }, context);

        return {member, subscription};
    }

    describe('#getRedeemedOfferIdsForSubscriptions', function () {
        it('returns redemptions for multiple subscriptions', async function () {
            const offerData = testUtils.DataGenerator.forKnex.createOffer({
                product_id: product.get('id')
            });
            const offerModel = await Offer.add(offerData, {context: {internal: true}});

            const {member, subscription} = await createMemberWithSubscription();

            await OfferRedemption.add({
                offer_id: offerModel.get('id'),
                member_id: member.get('id'),
                subscription_id: subscription.get('id'),
                created_at: new Date()
            }, context);

            const result = await api.getRedeemedOfferIdsForSubscriptions({
                subscriptionIds: [subscription.get('id')]
            });

            assert.equal(result.length, 1);
            assert.equal(result[0].subscription_id, subscription.get('id'));
            assert.equal(result[0].offer_id, offerModel.get('id'));
        });

        it('returns empty array for empty subscription list', async function () {
            const result = await api.getRedeemedOfferIdsForSubscriptions({
                subscriptionIds: []
            });

            assert.deepEqual(result, []);
        });
    });
});
