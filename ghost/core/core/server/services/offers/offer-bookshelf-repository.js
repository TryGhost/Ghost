const {flowRight} = require('lodash');
const {mapKeyValues, mapQuery} = require('@tryghost/mongo-utils');
const DomainEvents = require('@tryghost/domain-events');
const Offer = require('./domain/models/offer');
const sentry = require('../../../shared/sentry');
const logger = require('@tryghost/logging');

const statusTransformer = mapKeyValues({
    key: {
        from: 'status',
        to: 'active'
    },
    values: [{
        from: 'active',
        to: true
    }, {
        from: 'archived',
        to: false
    }]
});

const rejectNonStatusTransformer = input => mapQuery(input, function (value, key) {
    if (key !== 'status') {
        return;
    }

    return {
        [key]: value
    };
});

const mongoTransformer = flowRight(statusTransformer, rejectNonStatusTransformer);

/**
 * @typedef {object} BaseOptions
 * @prop {import('knex').Knex.Transaction} transacting
 */

/**
 * @typedef {object} ListOptions
 * @prop {import('knex').Knex.Transaction} transacting
 * @prop {string} filter
 */

class OfferBookshelfRepository {
    /**
     * @param {{forge: (data: object) => import('bookshelf').Model<Offer.OfferProps>}} OfferModel
     * @param {{forge: (data: object) => import('bookshelf').Model<any>}} OfferRedemptionModel
     */
    constructor(OfferModel, OfferRedemptionModel) {
        /** @private */
        this.OfferModel = OfferModel;
        /** @private */
        this.OfferRedemptionModel = OfferRedemptionModel;
    }

    /**
     * @template T
     * @param {(t: import('knex').Knex.Transaction) => Promise<T>} cb
     * @returns {Promise<T>}
     */
    async createTransaction(cb) {
        return this.OfferModel.transaction(cb);
    }

    /**
     * @param {string} name
     * @param {BaseOptions} [options]
     * @returns {Promise<boolean>}
     */
    async existsByName(name, options) {
        const model = await this.OfferModel.findOne({name}, options);
        if (!model) {
            return false;
        }
        return true;
    }

    /**
     * @param {string} code
     * @param {BaseOptions} [options]
     * @returns {Promise<boolean>}
     */
    async existsByCode(code, options) {
        const model = await this.OfferModel.findOne({code}, options);
        if (!model) {
            return false;
        }
        return true;
    }

    /**
     * @private
     * @param {import('bookshelf').Model<any>} model
     * @param {BaseOptions} options
     * @returns {Promise<import('./domain/models/offer')>}
     */
    async mapToOffer(model, options) {
        const json = model.toJSON();
        const count = await this.OfferRedemptionModel.where({offer_id: json.id}).count('id', {
            transacting: options.transacting
        });

        const lastRedeemed = await this.OfferRedemptionModel.where({offer_id: json.id}).orderBy('created_at', 'DESC').fetchAll({
            transacting: options.transacting,
            limit: 1
        });

        try {
            const lastRedeemedObject = lastRedeemed.toJSON();

            return await Offer.create({
                id: json.id,
                name: json.name,
                code: json.code,
                display_title: json.portal_title,
                display_description: json.portal_description,
                type: json.discount_type === 'amount' ? 'fixed' : json.discount_type,
                amount: json.discount_amount,
                cadence: json.interval,
                currency: json.currency,
                duration: json.duration,
                duration_in_months: json.duration_in_months,
                stripe_coupon_id: json.stripe_coupon_id,
                redemptionCount: count,
                redemption_type: json.redemption_type,
                status: json.active ? 'active' : 'archived',
                tier: {
                    id: json.product.id,
                    name: json.product.name
                },
                created_at: json.created_at,
                last_redeemed: lastRedeemedObject.length > 0 ? lastRedeemedObject[0].created_at : null
            }, null);
        } catch (err) {
            logger.error(err);
            sentry.captureException(err);
            return null;
        }
    }

    /**
     * @param {string} id
     * @param {BaseOptions} [options]
     * @returns {Promise<import('./domain/models/offer')>}
     */
    async getById(id, options) {
        const model = await this.OfferModel.findOne({id}, {
            ...options,
            withRelated: ['product']
        });

        if (!model) {
            return null;
        }

        return this.mapToOffer(model, options);
    }

    /**
     * @param {string} id stripe_coupon_id
     * @param {BaseOptions} [options]
     * @returns {Promise<import('./domain/models/offer')>}
     */
    async getByStripeCouponId(id, options) {
        const model = await this.OfferModel.findOne({stripe_coupon_id: id}, {
            ...options,
            withRelated: ['product']
        });

        if (!model) {
            return null;
        }

        return this.mapToOffer(model, options);
    }

    /**
     * @param {ListOptions} options
     * @returns {Promise<import('./domain/models/offer')[]>}
     */
    async getAll(options) {
        const models = await this.OfferModel.findAll({
            ...options,
            mongoTransformer,
            withRelated: ['product']
        });

        const mapOptions = {
            transacting: options && options.transacting
        };

        const offers = models.map(model => this.mapToOffer(model, mapOptions));

        return (await Promise.all(offers)).filter(offer => offer !== null);
    }

    /**
     * @param {object} options
     * @param {string} options.subscriptionId
     * @param {import('knex').Knex.Transaction} [options.transacting]
     * @returns {Promise<string[]>}
     */
    async getRedeemedOfferIdsForSubscription({subscriptionId, transacting}) {
        const redemptions = await this.OfferRedemptionModel.where({
            subscription_id: subscriptionId
        }).fetchAll({transacting, columns: ['offer_id']});

        return redemptions.map(r => r.get('offer_id'));
    }

    /**
     * @param {import('./domain/models/offer')} offer
     * @param {BaseOptions} [options]
     * @returns {Promise<void>}
     */
    async save(offer, options) {
        /** @type any */
        const data = {
            id: offer.id,
            name: offer.name.value,
            code: offer.code.value,
            portal_title: offer.displayTitle.value || null,
            portal_description: offer.displayDescription.value || null,
            discount_type: offer.type.value === 'fixed' ? 'amount' : offer.type.value,
            discount_amount: offer.amount.value,
            interval: offer.cadence.value,
            product_id: offer.tier.id,
            duration: offer.duration.value.type,
            duration_in_months: offer.duration.value.type === 'repeating' ? offer.duration.value.months : null,
            currency: offer.currency ? offer.currency.value : null,
            active: offer.status.value === 'active',
            redemption_type: offer.redemptionType.value
        };

        if (offer.stripeCouponId !== undefined) {
            data.stripe_coupon_id = offer.stripeCouponId;
        }

        if (offer.isNew) {
            await this.OfferModel.add(data, options);
        } else {
            await this.OfferModel.edit(data, {...options, id: data.id});
        }

        for (const event of offer.events) {
            if (options.transacting) {
                // Only dispatch the event after the transaction has finished
                // Because else the offer won't be committed to the database yet
                options.transacting.executionPromise.then(() => {
                    DomainEvents.dispatch(event);
                });
            } else {
                DomainEvents.dispatch(event);
            }
        }
    }
}

module.exports = OfferBookshelfRepository;
