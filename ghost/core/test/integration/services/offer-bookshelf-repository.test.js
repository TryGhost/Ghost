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

    describe('#getAll', function () {
        it('skips redemption stats when withRedemptionStats is false', async function () {
            const context = testUtils.context.admin;

            const product = await Product.add({
                name: 'Test Product',
                slug: 'test-product',
                type: 'paid'
            }, context);

            const offerData = testUtils.DataGenerator.forKnex.createOffer({
                product_id: product.get('id')
            });
            const offerModel = await Offer.add(offerData, {context: {internal: true}});

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

            // Add two redemptions so we can verify the last redeemed date is the latest
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

            // Create an unredeemed offer
            const offerData2 = testUtils.DataGenerator.forKnex.createOffer({
                product_id: product.get('id'),
                name: 'No Redemptions Offer',
                code: 'no-redemptions'
            });
            const offerModel2 = await Offer.add(offerData2, {context: {internal: true}});

            // Create an archived fixed-amount offer
            const offerData3 = testUtils.DataGenerator.forKnex.createOffer({
                product_id: product.get('id'),
                name: 'Archived Amount Offer',
                code: 'archived-amount',
                discount_type: 'amount',
                discount_amount: 500,
                currency: 'USD',
                active: false
            });
            const offerModel3 = await Offer.add(offerData3, {context: {internal: true}});

            const repository = new OfferBookshelfRepository(Offer, OfferRedemption);

            // With stats - redeemed offer should have redemptionCount and lastRedeemed
            const offersWithStats = await repository.getAll({});
            const offerWithStats = offersWithStats.find(o => o.id === offerModel.get('id'));
            assert.equal(offerWithStats.redemptionCount, 2);
            assert.equal(new Date(offerWithStats.lastRedeemed).toISOString(), newerDate.toISOString());

            // Unredeemed offer should have redemptionCount 0
            const unredeemedWithStats = offersWithStats.find(o => o.id === offerModel2.get('id'));
            assert.equal(unredeemedWithStats.redemptionCount, 0);
            assert.equal(unredeemedWithStats.lastRedeemed, null);

            // Archived fixed-amount offer should be mapped correctly
            const archivedOffer = offersWithStats.find(o => o.id === offerModel3.get('id'));
            assert.equal(archivedOffer.status.value, 'archived');
            assert.equal(archivedOffer.type.value, 'fixed');

            // Without stats - should have redemptionCount 0 and lastRedeemed null
            const offersWithoutStats = await repository.getAll({}, {withRedemptionStats: false});
            const offerWithoutStats = offersWithoutStats.find(o => o.id === offerModel.get('id'));
            assert.equal(offerWithoutStats.redemptionCount, 0);
            assert.equal(offerWithoutStats.lastRedeemed, null);
        });
    });
});
