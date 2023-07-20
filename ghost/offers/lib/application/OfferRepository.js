const {flowRight} = require('lodash');
const {mapKeyValues, mapQuery} = require('@tryghost/mongo-utils');
const DomainEvents = require('@tryghost/domain-events');
const OfferCodeChangeEvent = require('../domain/events/OfferCodeChangeEvent');
const OfferCreatedEvent = require('../domain/events/OfferCreatedEvent');
const Offer = require('../domain/models/Offer');
const OfferStatus = require('../domain/models/OfferStatus');

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
 * @prop {import('knex').Transaction} transacting
 */

/**
 * @typedef {object} ListOptions
 * @prop {import('knex').Transaction} transacting
 * @prop {string} filter
 */

/**
 * @typedef {object} OfferAdditionalParams
 * @prop {string} productId — the Ghost Product ID
 * @prop {string} currency — the currency of the plan
 * @prop {string} interval — the billing interval of the plan (month, year)
 * @prop {boolean} active — whether the offer is active upoon creation
 */

class OfferRepository {
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
     * @param {(t: import('knex').Transaction) => Promise<T>} cb
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
     * @returns {Promise<Offer>}
     */
    async mapToOffer(model, options) {
        const json = model.toJSON();

        const count = await this.OfferRedemptionModel.where({offer_id: json.id}).count('id', {
            transacting: options.transacting
        });
        return Offer.create({
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
            redemptionCount: count,
            status: json.active ? 'active' : 'archived',
            tier: {
                id: json.product.id,
                name: json.product.name
            }
        }, null);
    }

    /**
     * @param {string} id
     * @param {BaseOptions} [options]
     * @returns {Promise<Offer>}
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
     * @returns {Promise<Offer>}
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
     * @returns {Promise<Offer[]>}
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

        return Promise.all(offers);
    }

    /**
      * @param {import('stripe').Stripe.CouponCreateParams} coupon
      * @param {OfferAdditionalParams} params
      * @param {BaseOptions} [options]
     */
    async createFromCoupon(coupon, params, options) {
        const {productId, currency, interval, active} = params;
        const code = coupon.name && coupon.name.split(' ').map(word => word.toLowerCase()).join('-');

        const data = {
            active,
            name: coupon.name,
            code,
            product_id: productId,
            stripe_coupon_id: coupon.id,
            interval,
            currency,
            duration: coupon.duration,
            duration_in_months: coupon.duration === 'repeating' ? coupon.duration_in_months : null,
            portal_title: coupon.name
        };

        if (coupon.percent_off) {
            data.discount_type = 'percent';
            data.discount_amount = coupon.percent_off;
        } else {
            data.discount_type = 'amount';
            data.discount_amount = coupon.amount_off;
        }

        await this.OfferModel.add(data, options);
    }

    /**
     * @param {Offer} offer
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
            active: offer.status.equals(OfferStatus.create('active'))
        };

        if (offer.codeChanged) {
            const event = OfferCodeChangeEvent.create({
                offerId: offer.id,
                previousCode: offer.oldCode,
                currentCode: offer.code
            });
            DomainEvents.dispatch(event);
        }

        if (offer.isNew) {
            await this.OfferModel.add(data, options);
            const event = OfferCreatedEvent.create({offer});

            if (options.transacting) {
                // Only dispatch the event after the transaction has finished
                // Because else the offer won't be committed to the database yet
                options.transacting.executionPromise.then(() => {
                    DomainEvents.dispatch(event);
                });
            } else {
                DomainEvents.dispatch(event);
            }
        } else {
            await this.OfferModel.edit(data, {...options, id: data.id});
        }
    }
}

module.exports = OfferRepository;
