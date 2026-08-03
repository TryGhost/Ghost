const {replaceFilters, chainTransformers, mapKeys} = require('@tryghost/mongo-utils');

function replaceCustomFilterTransformer(filter) {
    return function (existingFilter) {
        return replaceFilters(existingFilter, {
            custom: filter
        });
    };
}

/**
 * Bookshelf adapter for the activity read model.
 *
 * Raw Gift models and persistence-specific query transformations remain
 * private to gift subscriptions. Callers receive stable activity facts.
 */
module.exports = class GiftActivityBookshelfRepository {
    constructor({GiftModel}) {
        this.GiftModel = GiftModel;
    }

    async browsePurchases(options = {}, filter) {
        const queryOptions = {
            ...options,
            withRelated: ['buyer', 'tier'],
            filter: 'buyer_member_id:-null+custom:true',
            useBasicCount: true,
            mongoTransformer: chainTransformers(
                replaceCustomFilterTransformer(filter),
                ...mapKeys({
                    'data.created_at': 'purchased_at',
                    'data.member_id': 'buyer_member_id'
                })
            )
        };

        if (queryOptions.order) {
            queryOptions.order = queryOptions.order.replace(/created_at/g, 'purchased_at');
        }

        const {data: models, meta} = await this.GiftModel.findPage(queryOptions);

        return {
            data: models.map((model) => {
                const json = model.toJSON(queryOptions);

                return {
                    id: json.id,
                    member: json.buyer || null,
                    member_id: json.buyer_member_id,
                    tier_name: json.tier?.name,
                    cadence: json.cadence,
                    duration: json.duration,
                    amount: json.amount,
                    currency: json.currency,
                    created_at: json.purchased_at
                };
            }),
            meta
        };
    }

    async browseRedemptions(options = {}, filter) {
        const queryOptions = {
            ...options,
            withRelated: ['redeemer', 'tier'],
            filter: 'redeemer_member_id:-null+custom:true',
            useBasicCount: true,
            mongoTransformer: chainTransformers(
                replaceCustomFilterTransformer(filter),
                ...mapKeys({
                    'data.created_at': 'redeemed_at',
                    'data.member_id': 'redeemer_member_id'
                })
            )
        };

        if (queryOptions.order) {
            queryOptions.order = queryOptions.order.replace(/created_at/g, 'redeemed_at');
        }

        const {data: models, meta} = await this.GiftModel.findPage(queryOptions);

        return {
            data: models.map((model) => {
                const json = model.toJSON(queryOptions);

                return {
                    id: json.id,
                    member: json.redeemer || null,
                    member_id: json.redeemer_member_id,
                    tier_name: json.tier?.name,
                    cadence: json.cadence,
                    duration: json.duration,
                    amount: json.amount,
                    currency: json.currency,
                    created_at: json.redeemed_at
                };
            }),
            meta
        };
    }
};
