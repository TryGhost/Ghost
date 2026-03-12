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

describe('OfferBookshelfRepository', function () {
    before(testUtils.teardownDb);
    beforeEach(testUtils.setup('roles'));
    afterEach(testUtils.teardownDb);

    let context, product, repository;

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

        repository = new OfferBookshelfRepository(Offer, OfferRedemption);
    });

    async function createMemberWithSubscription() {
        const member = await Member.add({
            email: 'test@offers.com',
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

    describe('#getAll', function () {
        it('returns redemption count and last redeemed date', async function () {
            const offerData = testUtils.DataGenerator.forKnex.createOffer({
                product_id: product.get('id')
            });
            const offerModel = await Offer.add(offerData, {context: {internal: true}});

            const {member, subscription} = await createMemberWithSubscription();

            const olderDate = new Date('2024-01-01');
            const newerDate = new Date('2025-06-15');

            await OfferRedemption.add({
                offer_id: offerModel.get('id'),
                member_id: member.get('id'),
                subscription_id: subscription.get('id'),
                created_at: olderDate
            }, context);

            await OfferRedemption.add({
                offer_id: offerModel.get('id'),
                member_id: member.get('id'),
                subscription_id: subscription.get('id'),
                created_at: newerDate
            }, context);

            const offers = await repository.getAll({});
            const offer = offers.find(o => o.id === offerModel.get('id'));

            assert.equal(offer.redemptionCount, 2);
            assert.equal(new Date(offer.lastRedeemed).toISOString(), newerDate.toISOString());
        });

        it('returns zero redemption count for unredeemed offers', async function () {
            const offerData = testUtils.DataGenerator.forKnex.createOffer({
                product_id: product.get('id')
            });
            const offerModel = await Offer.add(offerData, {context: {internal: true}});

            const offers = await repository.getAll({});
            const offer = offers.find(o => o.id === offerModel.get('id'));

            assert.equal(offer.redemptionCount, 0);
            assert.equal(offer.lastRedeemed, null);
        });

        it('maps archived offers as archived', async function () {
            const offerData = testUtils.DataGenerator.forKnex.createOffer({
                product_id: product.get('id'),
                active: false
            });
            const offerModel = await Offer.add(offerData, {context: {internal: true}});

            const offers = await repository.getAll({});
            const offer = offers.find(o => o.id === offerModel.get('id'));

            assert.equal(offer.status.value, 'archived');
        });

        it('maps amount discount type as fixed', async function () {
            const offerData = testUtils.DataGenerator.forKnex.createOffer({
                product_id: product.get('id'),
                discount_type: 'amount',
                discount_amount: 500,
                currency: 'USD'
            });
            const offerModel = await Offer.add(offerData, {context: {internal: true}});

            const offers = await repository.getAll({});
            const offer = offers.find(o => o.id === offerModel.get('id'));

            assert.equal(offer.type.value, 'fixed');
        });

        it('filters out offers with missing product', async function () {
            const offerData = testUtils.DataGenerator.forKnex.createOffer({
                product_id: product.get('id')
            });
            const offerModel = await Offer.add(offerData, {context: {internal: true}});

            // Remove the product so the offer has no tier
            await offerModel.save({product_id: null}, {patch: true, context: {internal: true}});

            const offers = await repository.getAll({});
            const offer = offers.find(o => o.id === offerModel.get('id'));

            assert.equal(offer, undefined);
        });

        it('skips redemption stats when withRedemptionStats is false', async function () {
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

            const offers = await repository.getAll({}, {withRedemptionStats: false});
            const offer = offers.find(o => o.id === offerModel.get('id'));

            assert.equal(offer.redemptionCount, 0);
            assert.equal(offer.lastRedeemed, null);
        });
    });

    describe('#existsByName', function () {
        it('returns true when offer exists', async function () {
            const offerData = testUtils.DataGenerator.forKnex.createOffer({
                product_id: product.get('id'),
                name: 'Existing Offer'
            });
            await Offer.add(offerData, {context: {internal: true}});

            assert.equal(await repository.existsByName('Existing Offer'), true);
        });

        it('returns false when offer does not exist', async function () {
            assert.equal(await repository.existsByName('Non-existent'), false);
        });
    });

    describe('#existsByCode', function () {
        it('returns true when offer exists', async function () {
            const offerData = testUtils.DataGenerator.forKnex.createOffer({
                product_id: product.get('id'),
                code: 'existing-code'
            });
            await Offer.add(offerData, {context: {internal: true}});

            assert.equal(await repository.existsByCode('existing-code'), true);
        });

        it('returns false when offer does not exist', async function () {
            assert.equal(await repository.existsByCode('non-existent'), false);
        });
    });
});
