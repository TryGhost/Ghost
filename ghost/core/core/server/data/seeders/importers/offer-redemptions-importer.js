const {faker} = require('@faker-js/faker');
const errors = require('@tryghost/errors');
const TableImporter = require('./table-importer');
const dateToDatabaseString = require('../utils/database-date');

class OfferRedemptionsImporter extends TableImporter {
    static table = 'offer_redemptions';
    static dependencies = ['offers', 'members_stripe_customers', 'members_stripe_customers_subscriptions', 'stripe_products'];
    defaultQuantity = 0;

    constructor(knex, transaction) {
        super(OfferRedemptionsImporter.table, knex, transaction);
    }

    async import(quantity = this.defaultQuantity) {
        if (!quantity) {
            return;
        }

        const [offers, stripeProducts, membersStripeCustomers, subscriptions] = await Promise.all([
            this.transaction.select('id', 'product_id', 'interval', 'created_at').from('offers'),
            this.transaction.select('product_id', 'stripe_product_id').from('stripe_products'),
            this.transaction.select('customer_id', 'member_id').from('members_stripe_customers'),
            this.transaction.select('id', 'customer_id', 'plan_id', 'plan_interval', 'created_at', 'current_period_end').from('members_stripe_customers_subscriptions')
        ]);

        const productIdByStripeProductId = new Map(stripeProducts.map(stripeProduct => [stripeProduct.stripe_product_id, stripeProduct.product_id]));
        const memberIdByCustomerId = new Map(membersStripeCustomers.map(customer => [customer.customer_id, customer.member_id]));
        const offersByProductAndInterval = new Map();

        for (const offer of offers) {
            const key = `${offer.product_id || 'all'}:${offer.interval}`;
            const groupedOffers = offersByProductAndInterval.get(key) || [];
            groupedOffers.push(offer);
            offersByProductAndInterval.set(key, groupedOffers);
        }

        this.subscriptionPool = [];
        let capacity = 0;

        for (const subscription of subscriptions) {
            const memberId = memberIdByCustomerId.get(subscription.customer_id);
            const productId = productIdByStripeProductId.get(subscription.plan_id);
            const matchingOffers = [
                ...(offersByProductAndInterval.get(`${productId}:${subscription.plan_interval}`) || []),
                ...(offersByProductAndInterval.get(`all:${subscription.plan_interval}`) || [])
            ];

            if (!memberId || matchingOffers.length === 0) {
                continue;
            }

            this.subscriptionPool.push({
                memberId,
                subscriptionId: subscription.id,
                subscriptionCreatedAt: dateToDatabaseString.parse(subscription.created_at),
                redemptionEndAt: this.getRedemptionEndDate(subscription.current_period_end),
                availableOffers: [...matchingOffers],
                lastRedeemedAt: null
            });
            capacity += matchingOffers.length;
        }

        if (this.subscriptionPool.length === 0) {
            throw new errors.IncorrectUsageError({
                message: 'Cannot generate offer redemptions because no subscriptions have matching offers.'
            });
        }

        if (quantity > capacity) {
            throw new errors.IncorrectUsageError({
                message: `Cannot generate ${quantity} offer redemptions with the current data set. Maximum unique subscription and offer combinations available: ${capacity}. Increase the offer or subscription quantities.`
            });
        }

        await super.import(quantity);
    }

    getRedemptionEndDate(currentPeriodEnd) {
        const now = new Date();
        const endDate = currentPeriodEnd ? dateToDatabaseString.parse(currentPeriodEnd) : now;

        return endDate > now ? now : endDate;
    }

    getCreatedAt(subscriptionState, offer) {
        const candidateEarliest = new Date(Math.max(
            subscriptionState.subscriptionCreatedAt.valueOf(),
            dateToDatabaseString.parse(offer.created_at).valueOf(),
            subscriptionState.lastRedeemedAt ? subscriptionState.lastRedeemedAt.valueOf() + 1000 : 0
        ));
        const earliest = new Date(Math.min(
            candidateEarliest.valueOf(),
            subscriptionState.redemptionEndAt.valueOf()
        ));
        const latest = subscriptionState.redemptionEndAt > earliest ? subscriptionState.redemptionEndAt : earliest;
        const createdAt = latest.valueOf() === earliest.valueOf() ? earliest : faker.date.between(earliest, latest);

        subscriptionState.lastRedeemedAt = createdAt;

        return dateToDatabaseString(createdAt);
    }

    generate() {
        const subscriptionIndex = faker.datatype.number({
            min: 0,
            max: this.subscriptionPool.length - 1
        });
        const subscriptionState = this.subscriptionPool[subscriptionIndex];
        const offerIndex = faker.datatype.number({
            min: 0,
            max: subscriptionState.availableOffers.length - 1
        });
        const [offer] = subscriptionState.availableOffers.splice(offerIndex, 1);

        if (subscriptionState.availableOffers.length === 0) {
            this.subscriptionPool[subscriptionIndex] = this.subscriptionPool[this.subscriptionPool.length - 1];
            this.subscriptionPool.pop();
        }

        return {
            id: this.fastFakeObjectId(),
            offer_id: offer.id,
            member_id: subscriptionState.memberId,
            subscription_id: subscriptionState.subscriptionId,
            created_at: this.getCreatedAt(subscriptionState, offer)
        };
    }
}

module.exports = OfferRedemptionsImporter;
