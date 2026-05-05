const moment = require('moment');

class SubscriptionStatsService {
    /**
     * @param {object} deps
     * @param {import('knex').Knex} deps.knex*/
    constructor({knex}) {
        this.knex = knex;
    }

    /**
     * @returns {Promise<{data: SubscriptionHistoryEntry[]}>}
     **/
    async getSubscriptionHistory() {
        const paidDeltas = await this.fetchAllSubscriptionDeltas();
        const giftDeltas = await this.fetchAllGiftDeltas();
        // Sum paid+gift entries that share (date, tier, cadence) so each
        // row produces a single coherent `count` snapshot. Sort ascending
        // because the rollback loop below walks the array backwards.
        const subscriptionDeltaEntries = aggregateDeltas(paidDeltas.concat(giftDeltas))
            .sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());
        const counts = await this.fetchSubscriptionCounts();

        /** @type {Object.<string, Object.<string, number>>} */
        const countData = {};
        counts.forEach((count) => {
            if (!countData[count.tier]) {
                countData[count.tier] = {};
            }
            countData[count.tier][count.cadence] = count.count;
        });

        /** @type {SubscriptionHistoryEntry[]} */
        let subscriptionHistoryEntries = [];

        /** @type {string[]} */
        let cadences = [];
        /** @type {string[]} */
        let tiers = [];

        for (let index = subscriptionDeltaEntries.length - 1; index >= 0; index -= 1) {
            const entry = subscriptionDeltaEntries[index];
            if (!countData[entry.tier]) {
                countData[entry.tier] = {};
            }
            if (!countData[entry.tier][entry.cadence]) {
                countData[entry.tier][entry.cadence] = 0;
            }

            subscriptionHistoryEntries.unshift({
                ...entry,
                date: moment(entry.date).format('YYYY-MM-DD'),
                count: countData[entry.tier][entry.cadence]
            });

            countData[entry.tier][entry.cadence] += entry.negative_delta;
            countData[entry.tier][entry.cadence] -= entry.positive_delta;

            if (!cadences.includes(entry.cadence)) {
                cadences.push(entry.cadence);
            }
            if (!tiers.includes(entry.tier)) {
                tiers.push(entry.tier);
            }
        }

        return {
            data: subscriptionHistoryEntries,
            meta: {
                cadences,
                tiers,
                totals: counts
            }
        };
    }

    /**
     * @returns {Promise<SubscriptionDelta[]>}
     **/
    async fetchAllSubscriptionDeltas() {
        const knex = this.knex;
        const rows = await knex('members_paid_subscription_events')
            .join('stripe_prices AS price', function () {
                this.on('price.stripe_price_id', '=', 'members_paid_subscription_events.from_plan')
                    .orOn('price.stripe_price_id', '=', 'members_paid_subscription_events.to_plan');
            })
            .join('stripe_products AS product', 'product.stripe_product_id', '=', 'price.stripe_product_id')
            .join('products AS tier', 'tier.id', '=', 'product.product_id')
            .leftJoin('stripe_prices AS from_price', 'from_price.stripe_price_id', '=', 'members_paid_subscription_events.from_plan')
            .leftJoin('stripe_prices AS to_price', 'to_price.stripe_price_id', '=', 'members_paid_subscription_events.to_plan')
            .select(knex.raw(`
                DATE(members_paid_subscription_events.created_at) as date
            `))
            .select(knex.raw(`
                tier.id as tier
            `))
            .select(knex.raw(`
                price.interval as cadence
            `))
            .select(knex.raw(`SUM(
                CASE
                    WHEN members_paid_subscription_events.type IN ('created','reactivated','active') AND members_paid_subscription_events.mrr_delta != 0 THEN 1
                    WHEN members_paid_subscription_events.type='updated' AND price.id = to_price.id THEN 1
                    WHEN members_paid_subscription_events.type='updated' AND members_paid_subscription_events.from_plan = members_paid_subscription_events.to_plan AND members_paid_subscription_events.mrr_delta > 0 THEN 1
                    ELSE 0
                END
            ) as positive_delta`))
            .select(knex.raw(`SUM(
                CASE
                    WHEN members_paid_subscription_events.type IN ('canceled', 'expired','inactive') AND members_paid_subscription_events.mrr_delta != 0 THEN 1
                    WHEN members_paid_subscription_events.type='updated' AND price.id = from_price.id THEN 1
                    ELSE 0
                END
            ) as negative_delta`))
            .select(knex.raw(`SUM(
                CASE
                    WHEN members_paid_subscription_events.type IN ('created','reactivated','active') AND members_paid_subscription_events.mrr_delta != 0 THEN 1
                    WHEN members_paid_subscription_events.type='updated' AND members_paid_subscription_events.from_plan = members_paid_subscription_events.to_plan AND members_paid_subscription_events.mrr_delta > 0 THEN 1
                    ELSE 0
                END
            ) as signups`))
            .select(knex.raw(`SUM(
                CASE
                    WHEN members_paid_subscription_events.type IN ('canceled', 'expired','inactive') AND members_paid_subscription_events.mrr_delta != 0 THEN 1
                    ELSE 0
                END
            ) as cancellations`))
            .groupBy('date', 'tier', 'cadence')
            .orderBy('date');

        return rows;
    }

    /**
      * Get the current total subscriptions grouped by Cadence and Tier.
      * Includes both paid subscriptions and currently-redeemed gifts so the
      * totals stay consistent with the gift-aware delta stream.
      * @returns {Promise<SubscriptionCount[]>}
      **/
    async fetchSubscriptionCounts() {
        const knex = this.knex;

        const [paidCounts, giftCounts] = await Promise.all([
            knex('members_stripe_customers_subscriptions')
                .select(knex.raw(`
                      COUNT(members_stripe_customers_subscriptions.id) AS count,
                      products.id AS tier,
                      stripe_prices.interval AS cadence
                 `))
                .join('stripe_prices', 'stripe_prices.stripe_price_id', '=', 'members_stripe_customers_subscriptions.stripe_price_id')
                .join('stripe_products', 'stripe_products.stripe_product_id', '=', 'stripe_prices.stripe_product_id')
                .join('products', 'products.id', '=', 'stripe_products.product_id')
                .whereNot('members_stripe_customers_subscriptions.mrr', 0)
                .groupBy('tier', 'cadence'),
            knex('gifts')
                .where('status', 'redeemed')
                .select(knex.raw('COUNT(id) as count'))
                .select('tier_id as tier')
                .select('cadence')
                .groupBy('tier_id', 'cadence')
        ]);

        return aggregateCounts(paidCounts.concat(giftCounts));
    }

    /**
     * Gift redemptions (signups) and gifts that have been consumed, expired,
     * or refunded (cancellations), shaped as SubscriptionDelta rows so they
     * appear alongside paid subscription deltas in the cadence breakdown.
     * @returns {Promise<SubscriptionDelta[]>}
     */
    async fetchAllGiftDeltas() {
        const knex = this.knex;
        // A gift is no longer active once it has been consumed, expired, or refunded.
        // Use whichever of those timestamps was set as the cancellation date.
        const cancellationDate = 'COALESCE(consumed_at, expired_at, refunded_at)';
        const [signups, cancellations] = await Promise.all([
            knex('gifts')
                .whereNotNull('redeemed_at')
                .select(knex.raw('DATE(redeemed_at) as date'))
                .select('tier_id as tier')
                .select('cadence')
                .select(knex.raw('COUNT(id) as count'))
                .groupByRaw('DATE(redeemed_at), tier_id, cadence'),
            knex('gifts')
                .whereIn('status', ['consumed', 'expired', 'refunded'])
                .whereNotNull('redeemed_at')
                .whereRaw(`${cancellationDate} IS NOT NULL`)
                .select(knex.raw(`DATE(${cancellationDate}) as date`))
                .select('tier_id as tier')
                .select('cadence')
                .select(knex.raw('COUNT(id) as count'))
                .groupByRaw(`DATE(${cancellationDate}), tier_id, cadence`)
        ]);

        return [
            ...signups.map(r => ({date: r.date, tier: r.tier, cadence: r.cadence, positive_delta: r.count, negative_delta: 0, signups: r.count, cancellations: 0})),
            ...cancellations.map(r => ({date: r.date, tier: r.tier, cadence: r.cadence, positive_delta: 0, negative_delta: r.count, signups: 0, cancellations: r.count}))
        ];
    }
}

/**
 * Sum SubscriptionCount entries that share the same (tier, cadence) key.
 * @param {SubscriptionCount[]} counts
 * @returns {SubscriptionCount[]}
 */
function aggregateCounts(counts) {
    /** @type {Map<string, SubscriptionCount>} */
    const byKey = new Map();
    for (const entry of counts) {
        const key = `${entry.tier}|${entry.cadence}`;
        const existing = byKey.get(key);
        if (existing) {
            existing.count += entry.count;
        } else {
            byKey.set(key, {tier: entry.tier, cadence: entry.cadence, count: entry.count});
        }
    }
    return Array.from(byKey.values());
}

/**
 * Sum SubscriptionDelta entries that share the same (date, tier, cadence) key.
 * @param {SubscriptionDelta[]} deltas
 * @returns {SubscriptionDelta[]}
 */
function aggregateDeltas(deltas) {
    /** @type {Map<string, SubscriptionDelta>} */
    const byKey = new Map();
    for (const entry of deltas) {
        const date = moment(entry.date).format('YYYY-MM-DD');
        const key = `${date}|${entry.tier}|${entry.cadence}`;
        const existing = byKey.get(key);
        if (existing) {
            existing.positive_delta += entry.positive_delta;
            existing.negative_delta += entry.negative_delta;
            existing.signups += entry.signups;
            existing.cancellations += entry.cancellations;
        } else {
            byKey.set(key, {
                date,
                tier: entry.tier,
                cadence: entry.cadence,
                positive_delta: entry.positive_delta,
                negative_delta: entry.negative_delta,
                signups: entry.signups,
                cancellations: entry.cancellations
            });
        }
    }
    return Array.from(byKey.values());
}

/** @typedef {object} SubscriptionCount
  * @prop {string} tier
  * @prop {string} cadence
  * @prop {number} count
  **/

/**
 * @typedef {object} SubscriptionDelta
 * @prop {string} tier
 * @prop {string} cadence
 * @prop {string} date
 * @prop {number} positive_delta
 * @prop {number} negative_delta
 * @prop {number} signups
 * @prop {number} cancellations
 **/

/**
 * @typedef {object} SubscriptionHistoryEntry
 * @prop {string} tier
 * @prop {string} cadence
 * @prop {string} date
 * @prop {number} positive_delta
 * @prop {number} negative_delta
 * @prop {number} signups
 * @prop {number} cancellations
 * @prop {number} count
 **/

module.exports = SubscriptionStatsService;
